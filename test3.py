from pymongo import MongoClient
import time

client = MongoClient('mongodb+srv://admin:mark6506@cluster0.0tcdjdu.mongodb.net/PHC_TestV2')

db = client['PHC_TestV2']
collection = db['UserData']

# อัปเดต field ที่กำหนดไว้เท่านั้น
result = collection.update_many(
    {},  # อัปเดตทุก document
    {
        "$max": {
            "score.python": 0,
            "score.unity": 0,
            "score.blender": 0,
            "score.website": 0
        }
    }
)

print(f"Matched: {result.matched_count}, Modified: {result.modified_count}")