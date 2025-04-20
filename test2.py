from pymongo import MongoClient
import time

client = MongoClient('mongodb+srv://admin:mark6506@cluster0.0tcdjdu.mongodb.net/PHC_TestV2')
filter={
    "$or": [
        {"score.python": {"$gt": 0}},
        {"score.unity": {"$gt": 0}},
        {"score.blender": {"$gt": 0}},
        {"score.website": {"$gt": 0}},
    ]
}

while True:
    result = client['PHC_TestV2']['UserData'].delete_many(
        filter=filter
    )
    if result.deleted_count > 0:
        print(f"deleted: " + str(result.deleted_count))
    time.sleep(5)