import { getUsersCollection } from "./user.repository.js";

export async function createUserIndexes(){
    const collection = getUsersCollection();
    
    await collection.createIndex(
        {email: 1},
        {
            unique: true,
            name: "unique_email_index"
        }
    )
    await collection.createIndex(
        {role: 1},
        {
            name: "role_index"
        }
    )
    console.log("User indexes created successfully");
}