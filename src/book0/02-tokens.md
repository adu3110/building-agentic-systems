# 2. Tokens — the alphabet of a language model

A neural network operates on numbers. But language is made of characters, words, sentences. To feed text into a neural network, you have to convert it into numbers first. The question is: what unit do you use?

This choice matters more than it might seem. Let's think through the options.

## Option 1: Characters

The simplest idea: map each character to an integer. 'a' → 1, 'b' → 2, ... 'z' → 26, space → 27, and so on.

The sentence `"the cat"` becomes `[20, 8, 5, 27, 3, 1, 20]`.

Problems with characters:

**The sequence gets very long.** A typical paragraph might be 500 characters. The model has to "remember" the connection between a word at position 1 and a word at position 490. That's a lot to track. The longer the sequence, the harder the problem.

**Characters carry almost no information individually.** The character 'c' doesn't tell you much. But the substring 'cat' tells you a lot. The model has to learn from scratch that t-h-e is the word "the", c-a-t is the word "cat", etc. This wastes capacity.

## Option 2: Words

Next idea: one token per word. `"the cat sat"` → `["the", "cat", "sat"]` → `[464, 3797, 3332]`.

This is better — each token carries real meaning. But:

**The vocabulary is enormous.** English has hundreds of thousands of words. Rare words ("defenestration", "ephemeral") appear almost never in training data, so the model learns almost nothing about them. New words (brand names, slang, technical terms) that didn't exist during training are completely unknown.

**Morphology is lost.** "run", "runs", "running", "ran" are four separate tokens with no obvious relationship. But they're all forms of the same verb. A character-aware approach would see the shared structure; a word-level approach doesn't.

**Code and punctuation are hard.** `function_name()` might be three words, or one, or six, depending on how you split. Edge cases multiply.

## Option 3: Subwords — what LLMs actually use

The approach used by all modern LLMs is called **Byte-Pair Encoding (BPE)** or a variant of it. The idea:

1. Start with characters as your vocabulary
2. Find the most frequent pair of adjacent tokens in your training data
3. Merge them into a single new token
4. Repeat

If "t" and "h" appear together frequently, they get merged into "th". If "th" and "e" appear frequently together, they become "the". Common words become single tokens. Rare words get broken into pieces.

Let's see what this looks like in practice (using tiktoken, which is what GPT-4 uses):

```python
import tiktoken
enc = tiktoken.get_encoding("cl100k_base")   # GPT-4's tokenizer

text = "The cat sat on the mat."
tokens = enc.encode(text)
print(tokens)
# [791, 8415, 9139, 389, 279, 2450, 13]

print([enc.decode([t]) for t in tokens])
# ['The', ' cat', ' sat', ' on', ' the', ' mat', '.']
```

Common English words get their own token. The space before a word is often part of the token (` cat` not `cat`).

Now try a rarer word:

```python
tokens = enc.encode("defenestration")
print([enc.decode([t]) for t in tokens])
# ['def', 'enes', 'tration']
```

Three pieces. The model can still work with this — it learns what "tration" tends to mean as a suffix, what "def" often starts (also: "def" in Python!). This graceful degradation is the key advantage.

Code:

```python
tokens = enc.encode("def calculate_loss(y_true, y_pred):")
print([enc.decode([t]) for t in tokens])
# ['def', ' calculate', '_loss', '(', 'y', '_true', ',', ' y', '_pred', '):']
```

It handles code and prose with the same tokenizer. Python keywords (`def`) get their own tokens. Underscores are part of identifiers.

## Why vocabulary size matters

GPT-2 used a vocabulary of ~50,000 tokens. GPT-4 uses ~100,000. Each token is a row in the embedding table (Chapter 3). More tokens means:

- Better handling of rare words (they get their own token instead of always being split)
- Larger embedding table (more memory)
- Shorter sequences for the same text (common phrases are one token)

There is a sweet spot. Too few tokens and you split everything into tiny pieces, making sequences very long. Too many and the model wastes capacity learning tokens it almost never sees.

## The context window is measured in tokens

When you hear "GPT-4 has a 128k context window", that means it can process 128,000 tokens at once. In English, that's roughly:

```
1 token ≈ 4 characters ≈ 0.75 words
128,000 tokens ≈ ~96,000 words ≈ a full novel
```

But "processing" doesn't mean "remembering". The model has to attend to all 128,000 tokens simultaneously — and as we'll see in the attention chapter, this gets expensive.

## What the model actually sees

By the time text reaches the neural network, it is nothing but a list of integers:

```
"The cat sat on the mat." → [791, 8415, 9139, 389, 279, 2450, 13]
```

No words. No characters. Just numbers. The model will look each number up in a table to get a vector (Chapter 3). From there, every operation is just arithmetic on vectors and matrices.

This is worth sitting with: the model never sees text. It sees integers, which it converts to vectors, and then operates on those vectors. The "understanding" of language emerges from learning which vectors and which operations minimize the prediction error on the training data.

## What a token is not

A token is not a word in the dictionary. It is not a semantic unit. It is not something the model understands at the character level. A token is just a chunk of text that appeared frequently enough in training data to be assigned its own ID in the vocabulary.

"Token" is a technical term, not a conceptual one. When you read "the model processes tokens", translate it to: "the model processes integers from a fixed vocabulary, where each integer corresponds to a chunk of text."

**Next →** [Embeddings — from integers to meaning](./03-embeddings.md)
