---
title: 'Passwords, hashes, and why salting matters'
description: 'Hashing is not encryption, a salt is not a secret, and SHA-256 is the wrong tool for passwords. Here is the model that keeps storage decisions sane.'
pubDate: 2026-07-08
tags: ['passwords', 'hashing', 'appsec']
---

Password storage discussions go wrong in predictable ways. Someone says “we hash it,” someone else asks about salt, and the conversation ends with a base64 string that nobody can defend. The fix is a small amount of vocabulary and a clear threat model.

## Hashing and encryption are different jobs

**Encryption** is reversible with a key. You use it when you need the original data back.

**Hashing** is a one-way transformation. Given the hash, you should not be able to recover the input. You use it when you only need to verify that an input matches.

A password should never be encrypted for storage. If an attacker steals both the database and the key, every password is exposed. A password verifier needs only enough information to check a candidate — not to recover the original.

## Why plain hashes are not enough

Suppose you store `SHA-256(password)`. That is one-way, which sounds safe. The problem is speed. Modern hardware computes billions of SHA-256 hashes per second, so an attacker with a stolen database can try enormous numbers of guesses.

Two additional problems:

- **Identical passwords produce identical hashes.** One cracked entry reveals every account that reused that password.
- **Precomputed tables** let attackers look up common hashes instantly.

## Salts fix the identical-hash problem

A salt is a unique, random value generated per password and stored next to the hash. The stored value becomes:

```text
hash(salt || password)
```

Every password now hashes differently, even if two users choose the same password. Precomputed tables stop working because the attacker would need a new table per salt.

A salt does **not** need to be secret. It needs to be unique and unpredictable. Store it alongside the hash. The security comes from uniqueness, not concealment.

Salting does not make a fast hash slow. It removes precomputation and cross-account reuse, but a single brute-force attempt is still cheap.

## Use a slow, memory-hard function

Password hashing needs to be expensive for the attacker. That means deliberately slow, tunable algorithms designed for the job:

| Algorithm | Notes |
| --- | --- |
| Argon2id | Modern default. Memory-hard, tunable. Winner of the Password Hashing Competition. |
| scrypt | Memory-hard, widely available. |
| bcrypt | Mature and well understood, but limited to 72 bytes of input. |
| PBKDF2 | Acceptable when FIPS compliance requires it; requires high iteration counts. |

Do not use general-purpose hashes such as MD5, SHA-1, or SHA-256 for password storage. They are designed to be fast.

The parameters matter:

- **Argon2id:** choose memory, iterations, and parallelism based on your hardware and a target verification time. Common starting points are tens of megabytes and a few iterations; benchmark on your production class of machine.
- **bcrypt:** a work factor of 12 or higher is a common baseline. Increase it as hardware improves.
- **PBKDF2:** hundreds of thousands of iterations of SHA-256 at minimum, following current guidance.

The right parameter is the one that makes legitimate logins take a few hundred milliseconds while making offline guessing expensive. Always benchmark.

## A correct storage format

Use a format that records the algorithm and parameters with the hash, so you can upgrade later:

```text
$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTmaaJObG
```

The components are algorithm, version, parameters, salt, and hash. When a user logs in successfully, check the recorded parameters. If they are outdated, rehash the password with the new parameters and update the record. This is how you migrate without forcing everyone to reset.

## Verify in constant time

Comparing hashes with `==` can leak information through timing in some implementations. Password libraries provide a constant-time comparison. Use the library's verify function rather than comparing strings yourself.

## What to do about breached passwords

Salting and slow hashing protect a stolen database. They do not protect a user who chooses a password that is already in a breach corpus. Check new passwords against a breached-password service or list at registration, and never store the plaintext after verification.

Rate limits, multi-factor authentication, and session controls matter as much as the hash. A perfect password hash does not compensate for an unlimited login endpoint.

## Common mistakes

- **Encrypting passwords instead of hashing them.** Reversible means recoverable.
- **Using SHA-256 because it is “secure.”** Secure for integrity, wrong for passwords.
- **A global salt.** It must be unique per password.
- **Keeping the salt secret.** Uniqueness is the property that matters.
- **Truncating passwords.** bcrypt's 72-byte limit is real; pre-hash correctly if you need to support longer input.
- **Logging passwords or hashes.** Both end up in places you cannot control.
- **Never rehashing.** Parameters age; plan upgrades.

## The model to remember

- Hash passwords, never encrypt them.
- Salt every password with a unique random value.
- Use Argon2id, scrypt, bcrypt, or PBKDF2 — never a fast general-purpose hash.
- Store the algorithm and parameters with the hash so you can upgrade.
- Verify with a constant-time comparison from a vetted library.
- Add rate limiting and MFA; hashing alone is not a login system.

Password storage is one of the few areas where “use the boring, standard library” is almost always the correct answer. The interesting work is choosing parameters you can defend and keeping the system upgradable.
