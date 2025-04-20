from pymongo import MongoClient
import time

client = MongoClient('mongodb+srv://admin:mark6506@cluster0.0tcdjdu.mongodb.net/PHC_TestV2')

results = client['PHC_TestV2']['Approve'].find()

for result in results:
    if str(result["username"]).lower().startswith("icez"):
        print(result)