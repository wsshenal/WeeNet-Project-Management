import os
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
from llama_index.core.llms import ChatMessage, MessageRole

MODEL_NAME = os.environ.get('LOCAL_MODEL', 'distilgpt2')
print(f'loading model {MODEL_NAME}')

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForCausalLM.from_pretrained(MODEL_NAME)

class LocalLLM:
    def __init__(self, model, tokenizer):
        self.model = model
        self.tokenizer = tokenizer

    def chat(self, messages, **kwargs):
        prompt_parts = []
        for m in messages:
            role = "SYSTEM" if m.role == MessageRole.SYSTEM else "USER"
            prompt_parts.append(f"<{role}>\n{m.content}\n")
        prompt = "\n".join(prompt_parts)
        prompt += "\n\n### RESPONSE:\n"
        print("--- PROMPT BEGIN ---")
        print(prompt)
        print("--- PROMPT END ---")
        inputs = self.tokenizer(prompt, return_tensors="pt")
        print("input shape", inputs['input_ids'].shape)
        outputs = self.model.generate(
            **inputs,
            max_new_tokens=64,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            pad_token_id=self.tokenizer.eos_token_id,
        )
        text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        print("RAW OUTPUT----")
        print(text)
        if "### RESPONSE:" in text:
            text = text.split("### RESPONSE:", 1)[1].strip()
        elif text.startswith(prompt):
            text = text[len(prompt) :]
        print("STRIPPED----")
        print(repr(text))
        return text

llm = LocalLLM(model, tokenizer)
msgs = [
    ChatMessage(role=MessageRole.SYSTEM, content="You are a helpful assistant."),
    ChatMessage(role=MessageRole.USER, content="Hello, please analyze the risk."),
]
print("CHAT RESULT")
print(llm.chat(msgs))
