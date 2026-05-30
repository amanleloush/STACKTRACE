---
title: Trie
---

# DSA · 11 · Trie

> Prefix trees for autocomplete, word dictionaries, multi-pattern search.

## When to use this pattern
- Many strings share prefixes and you want one structure that indexes them all.
- Queries are by **prefix** rather than exact match — autocomplete, "starts with X", suggestion lists.
- You have a dictionary of words and a grid/stream to scan for **all** matches simultaneously (otherwise it's N × M substring checks).
- You need wildcard matching (`.`) over a fixed alphabet — branch the search at the wildcard step.
- XOR-maximization problems on integers — a binary trie of bits is the secret weapon.

## The shape of the solution
Every node holds an array (or hashmap) of children, indexed by character, plus a flag for "a word ends here." Insertion walks the string and creates nodes on demand; search walks and asks "does the path exist?"; `startsWith` is the same as search but doesn't require the end flag. Once you have this skeleton, every variant — wildcards, weighted suggestions, grid DFS — just adds a small piece of per-node state (a count, a top-K cache, the word string) without changing the traversal.

## Topics in this section
<div class="topic-grid">
  <a class="topic-card" href="01-insert-search/"><span class="topic-card__num">01</span><h3>Insert / Search</h3><p>The three core operations.</p></a>
  <a class="topic-card" href="02-word-dictionary/"><span class="topic-card__num">02</span><h3>Word Dictionary</h3><p>DFS at every '.' wildcard.</p></a>
  <a class="topic-card" href="03-word-search-ii/"><span class="topic-card__num">03</span><h3>Word Search II</h3><p>Trie + grid DFS, prune dead branches.</p></a>
  <a class="topic-card" href="04-autocomplete/"><span class="topic-card__num">04</span><h3>Autocomplete</h3><p>Cache top-K at each node.</p></a>
</div>

## Common variations
**Binary tries** (32-level trees over bit positions) solve "max XOR pair" in O(n · 32). **Suffix tries / suffix arrays** generalize to substring queries. For huge alphabets, swap fixed-size arrays for hash maps. When the dictionary is static, you can compress single-child chains into a "radix tree" for less memory, but the textbook trie is almost always fast enough. The Aho-Corasick automaton is "trie + failure links" — the next step up for multi-pattern matching at scale.
