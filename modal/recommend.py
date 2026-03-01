import modal

app = modal.App("mello-recommend")

image = modal.Image.debian_slim().pip_install(
    "sentence-transformers",
    "numpy",
    "openai",
    "fastapi[standard]"
)

@app.function(image=image, gpu="any")
@modal.fastapi_endpoint(method="POST")
def recommend(data: dict):
    import numpy as np
    from sentence_transformers import SentenceTransformer
    import json

    model = SentenceTransformer("all-MiniLM-L6-v2")

    top_songs = data.get("topSongs", [])
    friend_songs = data.get("friendSongs", [])
    friend_name = data.get("friendName", "your friend")
    candidate_songs = data.get("candidateSongs", [])

    if not top_songs or not candidate_songs:
        return {"error": "Missing songs"}

    # Create text representations
    def song_to_text(s):
        return f"{s['name']} by {s['artist']}"

    # Embed user's top songs
    user_texts = [song_to_text(s) for s in top_songs]
    user_embeddings = model.encode(user_texts)
    user_vector = np.mean(user_embeddings, axis=0)
    # Blend with historical taste from Supermemory
    historical_songs = data.get("historicalSongs", [])
    if historical_songs:
        hist_texts = [song_to_text(s) for s in historical_songs[:5]]
        hist_embeddings = model.encode(hist_texts)
        hist_vector = np.mean(hist_embeddings, axis=0)
    # 70% current taste, 30% historical
        user_vector = 0.7 * user_vector + 0.3 * hist_vector

    # If friend songs provided, blend vectors
    if friend_songs:
        friend_texts = [song_to_text(s) for s in friend_songs]
        friend_embeddings = model.encode(friend_texts)
        friend_vector = np.mean(friend_embeddings, axis=0)
        # Blend 50/50
        user_vector = (user_vector + friend_vector) / 2

    # Embed candidate songs
    candidate_texts = [song_to_text(s) for s in candidate_songs]
    candidate_embeddings = model.encode(candidate_texts)

    # Compute cosine similarity
    def cosine_similarity(a, b):
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

    scored = []
    for i, candidate in enumerate(candidate_songs):
        score = cosine_similarity(user_vector, candidate_embeddings[i])
        # Generate explanation based on score
        similarities_to_user = [cosine_similarity(user_embeddings[j], candidate_embeddings[i]) for j in range(len(user_embeddings))]
        most_similar_idx = int(np.argmax(similarities_to_user))
        most_similar_song = top_songs[most_similar_idx]

        if score > 0.75:
            explanation = f"Matches the style of {most_similar_song['name']} by {most_similar_song['artist']}"
        elif score > 0.70:
            explanation = f"Similar energy to {most_similar_song['name']}"
        elif score > 0.65:
            explanation = f"Shares the vibe of {most_similar_song['artist']}'s sound"
        else:
            explanation = f"Complements your taste in {most_similar_song['artist']}"
        scored.append({
            "id": candidate.get("id"),
            "name": candidate["name"],
            "artist": candidate["artist"],
            "albumArt": candidate.get("albumArt", ""),
            "score": score,
            "explanation": explanation,
        })

    # Sort by score descending, return top 10
    scored.sort(key=lambda x: x["score"], reverse=True)
    return {"recommendations": scored[:10]}