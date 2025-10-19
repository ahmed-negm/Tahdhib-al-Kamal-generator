You are given an Arabic biographical entry from *تهذيب الكمال* about a hadith narrator.  
Your task is to extract the **complete list** of narrators who narrated **FROM** him (students) and **TO** him (teachers).  

## Instructions:
1. The section **"رَوَى عَن"** lists the narrators that the person narrated **TO** (i.e., his teachers).  
2. The section **"رَوَى عَنه"** lists the narrators that narrated **FROM** him (i.e., his students).  
3. Each name may be followed by one or more symbols inside parentheses such as `(خ م د س)` which indicate which canonical hadith collections include their narrations.  
4. Sometimes the text includes words like "يقال: مرسل" or extra commentary after a name. Ignore those notes and only extract the narrator’s name and symbols.  
5. If a name has **no symbols**, leave the `"symbols"` field as an empty string.  
6. Output must be in **JSON** format exactly as shown below.  
7. Do not add explanations, commentary, or extra fields — just return the JSON.

## Output Schema (STRICT):
```json
{
  "teachers": [
    {
      "name": "Narrators in  **"رَوَى عَن"** section. Narrator name exactly like in the provided text",
      "symbols": "(خ م ت س)"
    }
  ],
  "students": [
    {
      "name": "Narrators in  **"رَوَى عَنه"** section. Narrator name exactly like in the provided text",
      "symbols": "(د س ق)"
    }
  ]
}
```

Now process the following text:
```text
{{bio}}
```