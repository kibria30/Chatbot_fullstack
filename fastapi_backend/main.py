from fastapi import FastAPI
from pydantic import BaseModel
from langchain_community.llms import Ollama
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://localhost:5173/",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5173/"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PromptForLLM(BaseModel):
    prompt: str

class OutputForLLM(BaseModel):
    output: str

@app.post("/llm/", response_model=OutputForLLM)
async def llm(input: PromptForLLM):
    llm = Ollama(model="qwen2.5:0.5b")
    response = llm.invoke(input.prompt)
    # print(response)
    return OutputForLLM(output=response)