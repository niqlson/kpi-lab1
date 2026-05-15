# ADR 001: Rich Domain Model

Status: accepted
Date: 2026-05-15

## What I'm deciding

The lab task says I have to pick between Anemic and Rich Domain Model and justify the choice in an ADR. So that's what this is.

I picked **Rich**.

## Why

The fitness booking domain has rules that should never be broken once an object is created:

- a class can't have capacity less than 1
- a time slot can't end before it starts
- a class that already started can't accept new bookings
- a full class can't accept new bookings
- a user can't book the same class twice

With Anemic these rules end up in services or use cases. With Rich they go on the entity itself, and you literally cannot construct an entity that breaks them. If a `FitnessClass` instance exists, its capacity is positive and its time slot is valid. If a `TimeSlot` exists, `start < end`. The check runs once, in the constructor.

In lab 1 the create-class rule and the update-class rule were duplicated in two route handlers and they were already starting to drift. The patch handler did this weird "merge new fields with old, then re-validate" dance that the create handler didn't need. That's exactly the kind of thing Rich Model is supposed to fix — one place per rule.

The lab 2 self-reflection questions also ask "where does business logic live?" and "can you test the domain without the DB?". Rich gives a clean answer to both: business logic lives on the entity, and yes I can test it without anything (47 domain tests run in 25 ms with no infrastructure). Anemic would make those answers fuzzier.

## What I gave up

- More files. Each entity has a constructor plus a method per state change (`rename`, `reschedule`, `changeCapacity`, etc.).
- Constructors throw. Every time the mapper rebuilds an entity from a DB row, the constructor runs all its checks again. If the DB ever has bad data, it fails loudly. Probably the right behaviour but not free.
- Updates got more verbose. In lab 1 the PATCH handler was a single SQL UPDATE. In lab 2 the use case has to call the right mutator method for each optional field. It's safer (each call re-validates) but it's more code.

## What I almost did instead

The lecture explicitly says Anemic is fine for simple domains and that it's "the reality of most projects". This domain is on the borderline of simple — there are real rules but not that many. In a real job for a project this size I'd probably pick Anemic and accept the tradeoff.

I went Rich here because the lab is explicitly about showing the difference between the two approaches. The reflection questions are easier to answer concretely with Rich, and the pattern is more useful to learn for future labs.
