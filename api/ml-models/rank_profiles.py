import pandas as pd
import lightgbm as lgb
import json
import sys
import os

# Получаем абсолютный путь к директории скрипта
script_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(script_dir, "model.txt")

data = json.load(sys.stdin)
profiles = pd.DataFrame(data["profiles"])
user = data["user"]

def compute_features(profile):
    return {
        "profileId": profile["id"],
        "sameCity": int(profile["city"] == user["city"]),
        "ageDiff": abs(int(profile["birthYear"]) - int(user["birthYear"])),
        "goalsMatchCount": len(set(profile.get("goals", [])) & set(user.get("goals", []))),
        "trustScore": user.get("trustScore", 40),
        "isVerified": int(profile.get("isVerified", False)),
        "likesReceived": profile.get("likesReceived", 0),
    }

features = pd.DataFrame([compute_features(p) for p in data["profiles"]])
profile_ids = features.pop("profileId")

model = lgb.Booster(model_file=model_path)
scores = model.predict(features)

result = [{"id": pid, "score": s} for pid, s in zip(profile_ids, scores)]
print(json.dumps(result))
