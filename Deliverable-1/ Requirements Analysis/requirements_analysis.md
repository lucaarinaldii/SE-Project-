# Requirements Analysis - Campus Makerspace Management System

## 1. Requirements Identification

Requirements were collected from the primary stakeholders (Student, Staff) and University IT, using user stories (Storie.docx), story maps (Stakeholder And Story) and use case descriptions.

## 2. Functional Requirements

| ID | Requirement | Use case |
|---|---|---|
| FR-01 | The system shall authenticate users with email and password and temporarily block login after 3 failed attempts. | 12. Authentication |
| FR-02 | Staff shall be able to create, edit and deactivate user accounts. | 11. Manage Accounts |
| FR-03 | Users shall be able to view the equipment catalogue with type, location and status, and filter it by type. | 5. View Equipment |
| FR-04 | Users shall be able to view free and booked time slots of a machine for a selected date. | 6. Track Availability |
| FR-05 | Users shall be able to reserve a free time slot; the system shall prevent double booking. | 3. Reserve Time Slot |
| FR-06 | Users shall confirm a reservation 15 minutes before the start; unconfirmed reservations shall be cancelled automatically. | 9. Check Reservation |
| FR-07 | Users shall be able to cancel their reservation before it starts; staff shall be able to cancel any reservation with a reason. | 8. Cancel Reservations |
| FR-08 | Users shall be able to view their reservation history; staff shall be able to view all reservations. | 4. View History of Reservations |
| FR-09 | Users shall be able to report an equipment issue from their reservation. | 1. Report / 7. Report Issue |
| FR-10 | Staff shall be able to view reports and change their status. | 7. Report Issue / 14. View Tickets |
| FR-11 | Staff shall be able to block a machine with a reason and period; affected users shall be notified. | 2. Block Machine |
| FR-12 | Staff shall be able to send a maintenance request for a machine. | 10. Call Maintenance |
| FR-13 | Staff shall be able to track and update material stock; the system shall warn when stock is below the minimum. | 13. Track Material |

## 3. Non-Functional Requirements

| ID | Category | Requirement | Source |
|---|---|---|---|
| NFR-01 | Capacity | The system shall support 1000 students. | NFR photo |
| NFR-02 | Performance | The equipment catalogue and the availability calendar shall load in less than 2 seconds. | NFR photo; 5. View Equipment, 6. Track Availability |
| NFR-03 | Privacy | Users shall see only their own reservations and reports; only staff shall see the data of all users. | NFR photo; 4. View History of Reservations, 7. Report Issue |
| NFR-04 | Security | Passwords shall not be stored in plain text. | NFR photo; 12. Authentication |
| NFR-05 | Security | Only users with the Staff role shall be able to block machines, manage accounts, view and process reports, call maintenance, track materials and cancel other users' reservations. | 2, 7, 8, 10, 11, 13, 14 |
| NFR-06 | Security | Login shall be temporarily blocked after 3 failed attempts. | 12. Authentication |
| NFR-07 | Reliability | Two users shall never be able to reserve the same time slot, even if they reserve it at the same moment. | 3. Reserve Time Slot, 6. Track Availability; user story "Reserve a 3D Printer" |
| NFR-08 | Timeliness | The confirmation reminder shall be sent 15 minutes before the start of the reservation. | 9. Check Reservation |
| NFR-09 | Reliability | If the database is unreachable, the system shall show a "service unavailable" message and save no partial changes. | 10. Call Maintenance, 12. Authentication |

*Note: "Automatic redirection if another machine is available" was listed as a non-functional requirement, but it describes system behaviour, so it is a functional requirement. It is listed under Conflicts.*

## 4. Conflicts

| Conflict | Status |
|---|---|
| Automatic rebooking to another equal machine (NFR photo, user story "Manage Equipment Maintenance") vs "Block Machine" (no rebooking) | Open |
| Machine status: "Maintenance" / "Out of order" (user story, sequence diagram) vs "Blocked" (use cases) | Open |
| Maximum booking duration (class diagram, story map, user story requirements task) vs no limit in "Reserve Time Slot" | Open |
| "Report" / "Report Issue": the use case diagram and the descriptions assign them to different actors | Open |
| Existing reservations when blocking a machine: automatically cancelled (user story) vs staff decides which to cancel ("Block Machine") | Open |
| "Student with active makerspace access" (user story) vs no access check in "Reserve Time Slot" | Open |

## 5. Gaps

Stated in the project description or story maps, but not covered by any use case yet:

- **Manage access:** granting and revoking access to specific equipment.
- **Unblock / reactivate machine:** shown in the story map "Manage equipment (with ticket)".
- **Add equipment and materials:** "The machine exists in the system" and "Materials are registered in the system" are preconditions, but no use case creates them.
