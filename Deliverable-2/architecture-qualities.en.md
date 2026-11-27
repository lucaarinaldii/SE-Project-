# Architecture, step 1: quality attributes

Use case: **View Equipment**.
These three qualities drive the architecture of the catalogue. The other project requirements stay real, but they belong to other use cases, such as reserving a machine.

## 1. Performance

The equipment catalogue loads in less than 2 seconds for up to 1000 students.
This is NFR-02, at the load in NFR-01. The student needs it: they open the catalogue and immediately see type, location, and status.


## 2. Security

The catalogue opens only when the request already has a session.
The answer does not include a password, another person's reservations, or another person's reports.
The machine list itself is the same for every signed-in student.
Privacy is the part of security this catalogue needs. This is NFR-03, and it is also the GDPR constraint. The student needs it.
Staff remain the only role that can see other people's data, in other use cases, not in this catalogue view.

## 3. Maintainability

`equipment.json` can be replaced by a database without changing the page, the catalogue, or the status module.
IT needs this. The system has to be kept for years, and the way data is stored is the decision most likely to change.


## 4. Reliability

No request overlap, even if made at the same moment


## Prioritization

1. **Reliability.** The project exists to book machines fairly. A double booking breaks the main promise.
2. **Security.** The system holds accounts, emails, and reports about people.
3. **Maintainability.** The system has to live for years, and storage is the decision most likely to change.
4. **Performance.** It is a threshold, not a goal to maximise. NFR-02 must be met, but when it conflicts with a quality above, the quality above wins.


## Justification as scenarios

| Quality | Stimulus |
|---|---|---|---|
| Reliability | Two students book the same slot at the same time. | One reservation is saved.
| Security | A student calls a staff route. | The request is refused. |
| Maintainability | The database vendor changes. | Only the storage layer changes. |
| Performance | 1000 students open the catalogue. | The list with type, location and status is shown. |


## Trade-off

Maintainability pulls against Performance.
A separate database keeps storage replaceable without changing the page, the catalogue, or status.
Each catalogue request then waits for that server, so the answer is slower for up to 1000 students.

Reliability pulls against Performance
A more secure reservetion sistem is obbligated to slow down the sistem so to be sure of no overlapping or overbooking
