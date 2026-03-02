import os
import chromadb
from chromadb.config import Settings
from dotenv import load_dotenv

load_dotenv()

class VectorDBClient:
    """
    Connects to ChromaDB Cloud to store and retrieve document embeddings.
    """
    def __init__(self):
        self.api_key = os.getenv("CHROMA_CLOUD_API_KEY")
        self.tenant = os.getenv("CHROMA_TENANT", "default_tenant")
        self.database = os.getenv("CHROMA_DATABASE", "default_database")
        self.collection_name = os.getenv("CHROMA_COLLECTION", "greyhr_knowledge")
        
        try:
            # Initialize ChromaDB Cloud Client
            self.client = chromadb.HttpClient(
                host="api.chroma.co", # Default Chroma cloud endpoint
                tenant=self.tenant,
                database=self.database,
                headers={"x-chroma-token": self.api_key}
            )
            
            # Get or create the collection
            self.collection = self.client.get_or_create_collection(name=self.collection_name)
            print(f"Connected to Chroma Cloud Collection: {self.collection_name}")
        except Exception as e:
            print(f"Failed to initialize Chroma Cloud Client: {e}")
            self.client = None
            self.collection = None

    def upsert(self, doc_id: str, text: str = None, metadata: dict = None, embeddings: list = None):
        """
        Add or update a document in the collection.
        If using an embedding model like Gemini, you can pass the embeddings.
        Otherwise, if Chroma has an embedding function baked in, you pass text.
        """
        if not self.collection:
            return False
            
        try:
            
            kwargs = {
                "ids": [doc_id],
                "metadatas": [metadata or {}]
            }
            if embeddings:
                kwargs["embeddings"] = [embeddings]
            if text:
                kwargs["documents"] = [text]
                
            self.collection.add(**kwargs)
            return True
        except Exception as e:
            print(f"Error upserting to ChromaDB: {e}")
            return False

    def search(self, query_texts: list = None, query_embeddings: list = None, top_k: int = 5):
        """
        Search for relevant documents in the collection.
        """
        if not self.collection:
            # Fallback mock for UI continuity if DB fails
            return [
                {"id": "mock_policy", "score": 0.9, "metadata": {"title": "Mock Leave Policy"}}
            ]
            
        try:
            kwargs = {
                "n_results": top_k
            }
            if query_embeddings:
                kwargs["query_embeddings"] = [query_embeddings]
            if query_texts:
                kwargs["query_texts"] = query_texts
                
            results = self.collection.query(**kwargs)
            
            # Format results
            formatted_results = []
            if results and results['ids'] and len(results['ids']) > 0:
                for i in range(len(results['ids'][0])):
                    formatted_results.append({
                        "id": results['ids'][0][i],
                        "metadata": results['metadatas'][0][i] if results['metadatas'] else {},
                        "document": results['documents'][0][i] if results['documents'] else "",
                        "distance": results['distances'][0][i] if results['distances'] else 0
                    })
            return formatted_results
        except Exception as e:
            print(f"Error searching ChromaDB: {e}")
            return []

vector_db = VectorDBClient()
