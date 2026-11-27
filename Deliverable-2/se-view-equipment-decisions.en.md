# Modular design decisions: View Equipment

English translation of `se-view-equipment-decisions.md`.

Working decisions for Software Engineering 1, the week “Modular Design and Software Construction”.
This is not code and it is not the step 8 report. The file is here so the decisions can be checked against the use case and the class diagram.

Use case: **View Equipment** (browsing the machine catalogue).
Project: Campus Makerspace Management System.
Authentication is not the use case we are designing. It stays only as a precondition.

Sources:

- the text of use case 5, View Equipment;
- the class diagram (`User`, `Student`, `Equipment`, subclasses, and a separate `Ticket` class);
- there is no sequence diagram for this use case in the repository. The order of steps is taken from the use case text.

Step 5 is written below. The step 6 code exists in two places: the standalone `view-equipment` project and the same catalogue inside `course_registration_portal`. Steps 7 and 8 are not done yet.

## Steps 1–2. Which classes and methods cover the scenario

### What on the diagram belongs to this use case

- `Equipment` has five fields: `ID`, `Type`, `Location`, `Max_Booking_Duration`, `Min_Threshold`.
- `Equipment` methods: `Get_Status()`, `Is_Open()`, `Get_N_Instruments(Type)`, `Check_Availability()`, `Is_Low()`.
- Subclasses: `3D Printer`, `Cutter`, `Elec Work`, `Printer`.
- The subclasses have `Get_Plastic()` and `Get_Ink()`.
- `Ticket` is a separate class. It is linked to a machine through `Equipment_ID`. It is not a field of `Equipment`.
- `Reserve()` and `Cancel()` are methods of `Student`, not of `Equipment`.
- The precondition “the user is logged in” is covered by the included use case Authentication: `User.Authenticate(Password)`.

### Decision for each step of the scenario

1. Open the catalogue. There is no separate “catalogue” class. `Get_N_Instruments(Type)` returns the number of machines of a type, not a list. The diagram does not cover a list of machines.
2. Show type, location, and current status. Type and location are the fields `Type` and `Location`. Status is `Get_Status()` or `Is_Open()`. Both return yes or no, not the word “open” or “blocked”. The list must show status, because that is what step 2 of the use case says.
3. Select a machine. There is no separate method for this. It is one `Equipment` identified by `ID`.
4. Show the description, the rules of use, and the status. Status is again `Get_Status()` / `Is_Open()`. The diagram has no description and no full rules text. We show `Max_Booking_Duration` as the rules of use: it is the only diagram field about rules. It is not a full rules text.
5. Go on to free slots or to a booking. Those are other use cases: `Equipment.Check_Availability()` and `Student.Reserve()`. We do not put them in the catalogue modules.

The use case filter names a 3D printer, a laser cutter, and electronics. On the diagram the close subclasses are `3D Printer`, `Cutter`, and `Elec Work`. The `Printer` subclass is not named in the filter text. That is a gap between the use case and the diagram, not a rule we invented. `Get_N_Instruments(Type)` is not enough for the filter: it returns a count, not a list.

If nothing is found, the scenario shows “No equipment found”. There is no separate method for that message.

If a machine is blocked, the scenario requires the label Blocked, a reason, and a period. `Is_Open()` can say that the machine is closed. The diagram has no reason and no period.

### What we deliberately leave out of View Equipment

- `Student.Reserve()`, `Student.Cancel()` — booking and cancellation. They do not belong in the catalogue.
- `Is_Low()`, `Min_Threshold` — stock.
- `Get_Plastic()`, `Get_Ink()` — material level. The scenario does not ask for them.
- `Check_Availability()` — the move into Track Availability.
- The `Ticket` class — fault reports. We do not turn it into a field of the machine.
- The other student and manager methods: history and accounts.

## Step 3. Modules

Five modules. Each one has one job, in one sentence.

1. **Catalogue page.** Shows the machine catalogue. It hides the screen and the request format. Other modules do not call it.
2. **Catalogue.** Describes the makerspace machines. It hides the subclasses, so a new machine type does not change the page.
3. **Status.** Says whether a machine can be used right now. It hides the two boolean methods on the diagram, `Get_Status()` and `Is_Open()`.
4. **Storage.** Returns the saved machine records. It hides whether that is a file or a database. The catalogue and the status module do not read the file themselves.
5. **Login.** Says whether this request already has a session. It hides the password, the number of failed attempts, and the sign-in method. For this use case it is only a precondition.

## Step 4. What we keep after the check

The same five modules. Inside each one there is functional cohesion: the pieces of a module do one job. Modules do not reach into each other’s fields.

1. The page does not read the file and does not call `Get_Status()` or `Is_Open()`. That would be content coupling: the page would reach into someone else’s data. It passes only the values that are needed. That is data coupling: the request goes to login, the type goes to the catalogue, and the id goes to status.
2. The catalogue does not include the block reason, free slots, ink or plastic level, or the stock threshold. Otherwise the cohesion of the catalogue drops.
3. Only the catalogue knows the machine subclass. Storage returns the `Type` field, not the classes `3D Printer`, `Cutter`, `Elec Work`, or `Printer`.
4. Status returns one result to the outside: open, or blocked, and when it is blocked also the reason and the period. The two flags from the diagram do not leave the module.
5. The machine list does not need a password or a student id. The catalogue is the same for every signed-in user. The page passes the request to login so login can tell whose session it is. There is no shared global login. That would be common coupling.
6. The record the catalogue reads from storage does not contain a ticket or `Min_Threshold`. `Ticket` is a separate class linked by `Equipment_ID`, not a field of the machine. Otherwise a change to reports or to stock would change the catalogue view.
7. Storage gives the catalogue a whole machine record (id, type, location, booking limit, description). That is stamp coupling: a structure is passed, not a single value. We accept it on this boundary because the catalogue needs several fields of the same record. The page does not see that record. Only the values from the page’s own contracts reach the page.

Checks that change one decision:

- “Yes/no” is replaced by “Blocked + reason + period”. The status module changes. The page, the catalogue, and storage stay.
- The file is replaced by a database. Only storage changes.
- The password is replaced by university login (on the stakeholder slide this is single university login). Only login changes.

## Step 5. Contracts between modules

The catalogue page calls login, the catalogue, and status. The catalogue and status call storage. The page does not call storage.

The use case list must show the current status. The catalogue does not return status. The page calls `listEquipment(type)` once, then calls `statusOf(ids)` once with the ids from that list, and joins the rows itself. A loop of `machineStatus(id)` for every machine is not allowed. The card of one selected machine calls `machineStatus(id)`.

An empty list is not an error: the page itself shows “No equipment found”.

The class diagram has no description, no full rules text, no reason, and no period. Those fields are already in the contracts. Until a description exists, the text comes back empty. That is not an error. Rules of use are filled from `Max_Booking_Duration` for now. Reason and period come from `readStoredStatus` when they have been saved.

### The page asks login

`currentSession(request)`

- Takes: the current request. The password and the student id are not passed.
- Returns: this request has a session.
- Can fail with: `NoSession`. The catalogue does not open in that case.
- Promises: the answer contains no password, no failed-attempt count, and no sign-in method. The function does not read a global session.

### The page asks the catalogue

`listEquipment(type)`

- Takes: a type, or an empty value when every machine is wanted. Allowed filter types: 3D printer, laser cutter, electronics.
- Returns: a list of id, type, and location.
- Can fail with: `UnknownType` when the type is not in that list. `StorageUnavailable`. An empty result is a successful answer.
- Promises: catalogue items contain no status. The page gets the list status from a separate `statusOf(ids)` call. There are no slots, no ink, no plastic, no stock threshold, and no ticket. Subclasses do not leave the module. `Printer` is missing from the use case filter even though the diagram has that subclass. That is a gap between the documents, not a rule. Such a machine is visible in the unfiltered list.

`equipmentDetails(id)`

- Takes: a machine id.
- Returns: id, type, location, description, and rules of use.
- Can fail with: `EquipmentNotFound`, `StorageUnavailable`.
- Promises: the rules of use are currently built from `Max_Booking_Duration`. The answer contains no block reason, no slots, no material level, no stock threshold, and no ticket.

### The page asks status

`statusOf(ids)`

- Takes: the list of machine ids that `listEquipment` has just returned.
- Returns: for each id, “open”, or “blocked” together with a reason and a period.
- Can fail with: `EquipmentNotFound` if some id does not exist. `StorageUnavailable`.
- Promises: one call for the whole list. Reason and period exist only for a blocked machine. `Get_Status()` and `Is_Open()` are not in the answer.

`machineStatus(id)`

- Takes: the id of the selected machine.
- Returns: “open”, or “blocked” together with a reason and a period.
- Can fail with: `EquipmentNotFound`, `StorageUnavailable`.
- Promises: the same as `statusOf`, but for one card. This call is not used for the rows of the list.

### The catalogue asks storage

`listMachineRecords()`

- Takes: nothing. Storage does not filter by type.
- Returns: records with id, the `Type` field, location, `Max_Booking_Duration`, and description.
- Can fail with: `StorageUnavailable`.
- Promises: this is the `Type` field, not the subtype classes. The record contains no status, no ticket, and no `Min_Threshold`. A report lives in the `Ticket` class.

`findMachineRecord(id)`

- Takes: a machine id.
- Returns: one record of the same shape.
- Can fail with: `EquipmentNotFound`, `StorageUnavailable`.
- Promises: the same as the list of records.

### Status asks storage

`readStoredStatus(id)`

- Takes: a machine id.
- Returns: the stored status value and, when they exist, the reason and the period.
- Can fail with: `EquipmentNotFound`, `StorageUnavailable`.
- Promises: storage does not decide what “blocked” means. The status module decides that. The two flags from the diagram stay inside the status module. The catalogue does not use this call.

## What is still open

- The check of whether the code kept your modules (step 7). The code is in `view-equipment` and in `course_registration_portal`.
- The one-page report (step 8).
- Where the description text, the block reason, and the block period will come from in the data. The contract names them. The class diagram does not. Until there is a separate rules text, the rules of use are taken from `Max_Booking_Duration`.
