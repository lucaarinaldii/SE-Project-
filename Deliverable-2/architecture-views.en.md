# Architecture, step 3: views

Use case: **View Equipment**.

## Scenario

Taken from use case 5 in the repository.

**Use case name:** View equipment

**Actor:** Student (primary)

**Precondition:** The user is authenticated in the system.

**Main success scenario:** The user wants to see what equipment the makerspace offers.

1. The user opens the equipment catalogue.
2. The system displays the list of equipment with type, location and current status.
3. The user selects a machine.
4. The system shows the machine details: description, rules of use and status.
5. The user may proceed to "Track Availability" or "Reserve time slot".

The user may filter the list by type (3D printer, laser cutter, electronics workstation) at any time.

**Extensions:**

- No equipment matches the filter. The system shows "No equipment found". The user changes or resets the filter.
- The machine is blocked. The system marks the machine as "Blocked" and shows the block reason and period.

**Postconditions:**

- Success: the user has seen the equipment list and/or the details of a machine.
- Exception: the user is informed that no equipment was found.

## Logical view (Class diagramm on deliverable 1)

What concepts exist, and how they relate.

| Concept | What it stands for |
|---|---|
| User | The person who is already signed in and looks at the catalogue |
| Equipment | A machine: type, location, description, and booking limit |
| Status | Open or blocked. A block has a reason and a period |

One User looks at many Equipment (not an association in the class diagram). Each Equipment has one current Status.

Status, description, reason, and period are not in the class diagram. The use case needs them. This is a gap between the diagram and the catalogue.

## Development view (Component diagramm on deliverable 2)

Who may call whom. One row per call.

| From | To | Interface | CodeName |
|---|---|---|---|
| Browser | API | `GET /api/catalogue`, `GET /api/equipment/:id` | REST API |
| API | Catalogue page | `buildList`, `buildDetails` | IPage |
| Catalogue page | Login | `currentSession` | ISession |
| Catalogue page | Catalogue | `listEquipment`, `equipmentDetails` | ICatalogue |
| Catalogue page | Status | `statusOf`, `machineStatus` | IStatus |
| Catalogue | Storage | `listMachineRecords`, `findMachineRecord` | IMachineRecord |
| Status | Storage | `readStoredStatus` | IStored Status |

Who must not call whom: storage does not call the API. The browser, login, the catalogue, and status do not open the database. Only storage does.

## Process view (Sequence diagramm on deliverable 1)

The order of one catalogue request.

| Step | Who | Calls | Gets back |
|---|---|---|---|
| 1 | Browser | `GET /api/catalogue` | JSON list |
| 2 | API | `buildList` | list + message |
| 3 | Catalogue page | Login `currentSession` | signed in |
| 4 | Catalogue page | Catalogue `listEquipment` | id, type, location |
| 5 | Catalogue | Storage `listMachineRecords` | id, type, location, description, booking limit |
| 6 | Catalogue page | Status `statusOf` once | open, or blocked with reason and period |
| 7 | Status | Storage `readStoredStatus` | the stored status, plus reason and period when the machine is blocked |
| 8 | API | the response to the browser | JSON: type, location, status. A blocked machine also has reason and period. If the list is empty, the text "No equipment found" |

One machine card is a separate request: `GET /api/equipment/:id`, then `currentSession`, `equipmentDetails`, and `machineStatus`. Catalogue calls `findMachineRecord`. Status calls `readStoredStatus`. The card returns description, rules, and status. Blocked includes reason and period.

## Physical view (Deployent diagramm on deliverable 2)

Where each part runs. Storage is a module in the Node.js process. The database runs on its own server.

| Part | Where it runs | Talks to the next part by |
|---|---|---|
| Browser | The student's laptop | HTTPS, JSON |
| API, catalogue page, login, catalogue, status, and storage | One Node.js process on one machine | A function call in the same process |
| Database | Its own server | TCP. Only storage opens that connection |

Today storage still reads `equipment.json`; the database is the target.

## Check (Use Case diagramm on deliverable 1)

| View | Question | Answer |
|---|---|---|
| Logical | Are the concepts there? | User and Equipment are in the class diagram. Status, description, reason, and period are not. That gap is recorded above. The catalogue still needs them. |
| Development | Is there a component and an interface for every step? | Yes. Browser, API, catalogue page, login, catalogue, status, and storage each have a call above. The page calls login through `currentSession`. Catalogue and status are separate. |
| Process | Does the sequence use only those interfaces? | Yes. The catalogue request and the single-machine card use only those calls, through to storage. |
| Physical | Does every component run somewhere, and does every call have a path? | Yes. The browser is on the laptop and uses HTTPS. The API, the catalogue page, login, the catalogue, status, and storage run in one Node.js process. The database runs on its own server. Only storage opens the TCP connection. |
