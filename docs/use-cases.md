# Use Cases — Fitness Class Booking System

The system lets gym members browse and book fitness classes, and lets admins manage the class schedule.

## Actors

- **Guest** — unauthenticated visitor
- **Client** — registered user who books classes
- **Admin** — manages the class schedule

---

## UC-1: Register

**Actor:** Guest

**Preconditions:** None.

**Main scenario:**
1. Guest sends `POST /api/auth/register` with `email`, `password`, `name`.
2. System validates the input (email format, password length).
3. System checks that no other user has this email.
4. System hashes the password and stores the new user with role `client`.
5. System returns `201 Created` with a JWT token and the user object (without password).

**Alternative scenarios:**
- **A1** Invalid email format → `400 Bad Request`.
- **A2** Password shorter than 8 characters → `400 Bad Request`.
- **A3** Email already registered → `409 Conflict`.

---

## UC-2: Log in

**Actor:** Client / Admin

**Preconditions:** User has previously registered (or admin was seeded).

**Main scenario:**
1. User sends `POST /api/auth/login` with `email`, `password`.
2. System verifies credentials.
3. System returns `200 OK` with a JWT token and the user object.

**Alternative scenarios:**
- **A1** Missing email or password → `400 Bad Request`.
- **A2** Wrong email or wrong password → `401 Unauthorized`.

---

## UC-3: View current user

**Actor:** Client / Admin

**Preconditions:** Caller is authenticated.

**Main scenario:**
1. Caller sends `GET /api/auth/me` with `Authorization: Bearer <token>`.
2. System verifies the token and returns the current user.

**Alternative scenarios:**
- **A1** Missing/invalid token → `401 Unauthorized`.

---

## UC-4: Browse fitness classes

**Actor:** Guest / Client / Admin

**Preconditions:** None.

**Main scenario:**
1. Caller sends `GET /api/classes`.
2. System returns all upcoming classes (those whose `startsAt` is in the future), sorted ascending.

**Variants:**
- `GET /api/classes/:id` — returns one class by id.
- **A1** Class not found → `404 Not Found`.

---

## UC-5: Create a fitness class

**Actor:** Admin

**Preconditions:** Caller is authenticated as admin.

**Main scenario:**
1. Admin sends `POST /api/classes` with `title`, `description`, `instructor`, `startsAt`, `endsAt`, `capacity`.
2. System validates input and invariants:
   - title is a non-empty string
   - capacity is a positive integer
   - startsAt is a valid ISO date in the future
   - endsAt is a valid ISO date strictly greater than startsAt
3. System persists the class and returns `201 Created` with the new class.

**Alternative scenarios:**
- **A1** Caller is not authenticated → `401 Unauthorized`.
- **A2** Caller is authenticated but not admin → `403 Forbidden`.
- **A3** Any invariant violated → `400 Bad Request`.

---

## UC-6: Update a fitness class

**Actor:** Admin

**Preconditions:** Class exists; caller is admin.

**Main scenario:**
1. Admin sends `PATCH /api/classes/:id` with the fields to change.
2. System validates the resulting class still satisfies all invariants.
3. System updates and returns `200 OK` with the updated class.

**Alternative scenarios:**
- **A1** Unauthenticated → `401`. Not admin → `403`.
- **A2** Class not found → `404 Not Found`.
- **A3** Invariants violated → `400 Bad Request`.

---

## UC-7: Delete a fitness class

**Actor:** Admin

**Preconditions:** Class exists; caller is admin.

**Main scenario:**
1. Admin sends `DELETE /api/classes/:id`.
2. System deletes the class and cascades any bookings for it.
3. Returns `204 No Content`.

**Alternative scenarios:**
- **A1** Unauthenticated → `401`. Not admin → `403`.
- **A2** Class not found → `404 Not Found`.

---

## UC-8: Book a class

**Actor:** Client

**Preconditions:** Caller is authenticated; class exists; class has not yet started; client has not already booked it; class has free capacity.

**Main scenario:**
1. Client sends `POST /api/bookings` with `classId`.
2. System verifies all preconditions.
3. System persists a booking and returns `201 Created` with the booking.

**Alternative scenarios:**
- **A1** Unauthenticated → `401 Unauthorized`.
- **A2** Class not found → `404 Not Found`.
- **A3** Class already started → `409 Conflict`.
- **A4** Client already has a booking for this class → `409 Conflict`.
- **A5** Class is at full capacity → `409 Conflict`.

---

## UC-9: View my bookings

**Actor:** Client

**Preconditions:** Caller is authenticated.

**Main scenario:**
1. Client sends `GET /api/bookings/my`.
2. System returns all bookings belonging to the caller (joined with class info).

**Alternative scenarios:**
- **A1** Unauthenticated → `401 Unauthorized`.

---

## UC-10: Cancel a booking

**Actor:** Client

**Preconditions:** Booking exists and belongs to the caller; the class has not yet started.

**Main scenario:**
1. Client sends `DELETE /api/bookings/:id`.
2. System verifies ownership and that the class has not started.
3. System removes the booking and returns `204 No Content`.

**Alternative scenarios:**
- **A1** Unauthenticated → `401 Unauthorized`.
- **A2** Booking not found, or belongs to a different user → `404 Not Found`.
- **A3** Class has already started → `409 Conflict`.

---

## Invariants summary

| # | Invariant | Where enforced |
|---|---|---|
| I-1 | Email format must be valid | register |
| I-2 | Password ≥ 8 characters | register |
| I-3 | Email unique across users | register |
| I-4 | Class title non-empty | create / update class |
| I-5 | Class capacity ≥ 1 | create / update class |
| I-6 | Class startsAt in the future | create / update class |
| I-7 | Class endsAt strictly after startsAt | create / update class |
| I-8 | Booking only on a not-yet-started class | book / cancel |
| I-9 | One booking per (user, class) | book |
| I-10 | Bookings count ≤ capacity | book |
