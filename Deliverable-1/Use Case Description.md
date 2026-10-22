# Use Case Descriptions — Campus Makerspace Management System

## 1. Report

| | |
|---|---|
| **Use Case Name** | Report |
| **Actors** | User (primary)<br>Staff (secondary) |
| **Preconditions** | - User is authenticated in the system;<br>- User has an active or recently completed reservation for the equipment. |
| **Main Success Scenario** | User wants to report a problem with the equipment they used.<br>1. User opens their reservation and selects the equipment.<br>2. System checks that the user has a reservation for this equipment.<br>3. User chooses "Report".<br>4. User selects the issue type and enters a description.<br>5. System saves the report with status "Open".<br>6. System notifies the staff.<br>7. User receives a confirmation. |
| **Extensions (Alternate Flows)** | **No reservation found:**<br>1. Report is not allowed;<br>2. System shows an error to the user.<br><br>**Required fields are empty:**<br>1. System highlights the missing fields;<br>2. User completes them and resubmits.<br><br>**Machine is unsafe to use:**<br>1. Staff reviews the report;<br>2. Staff blocks the machine ("Block Machine" extends this use case). |
| **Postconditions** | Success: report is saved and staff is notified.<br>Exception: report is not created and the user is informed why. |

## 2. Block Machine

| | |
|---|---|
| **Use Case Name** | Block Machine |
| **Actors** | Staff (primary)<br>User (secondary) |
| **Preconditions** | - Staff is authenticated in the system;<br>- Staff has staff rights;<br>- The machine exists in the system. |
| **Main Success Scenario** | Staff wants to make a machine unavailable for maintenance or repair.<br>1. Staff selects the machine.<br>2. Staff chooses "Block machine".<br>3. Staff enters the reason and the block period.<br>4. System shows the reservations in this period.<br>5. Staff decides which reservations to cancel.<br>6. System cancels the selected reservations and notifies the affected users.<br>7. System sets the machine status to "Blocked".<br>8. Staff receives a confirmation. |
| **Extensions (Alternate Flows)** | **Machine is already blocked:**<br>1. System shows the current block details;<br>2. Staff can edit or extend the existing block.<br><br>**Machine is currently in use:**<br>1. System warns the staff about the active session;<br>2. Staff chooses to block immediately or after the session ends. |
| **Postconditions** | Success: machine is blocked for the given period and affected users are notified.<br>Exception: machine status is unchanged. |

## 3. Reserve Time Slot

| | |
|---|---|
| **Use Case Name** | Reserve time slot |
| **Actors** | User (primary) |
| **Preconditions** | - User is authenticated in the system. |
| **Main Success Scenario** | User wants to reserve a piece of equipment.<br>1. User selects the equipment.<br>2. System **includes** "Track Availability" and shows free time slots.<br>3. User selects a time slot.<br>4. System checks that the slot is still free.<br>5. Reservation is created.<br>6. User receives a confirmation.<br>7. User confirms the reservation 15 minutes before the start. |
| **Extensions (Alternate Flows)** | **Slot is no longer available:**<br>1. Reservation fails;<br>2. System shows an error and suggests the nearest free slots.<br><br>**Machine is blocked:**<br>1. System does not show the machine's slots as available;<br>2. System shows the block reason to the user. |
| **Postconditions** | Success: time slot is reserved and confirmed by the user.<br>Exception: no reservation is created and the user is notified of failure. |


## 4. View History of Reservations

| | |
|---|---|
| **Use Case Name** | View history of reservations |
| **Actors** | User (primary)<br>Staff (primary) |
| **Preconditions** | - User/Staff is authenticated in the system;<br>- To view all reservations, Staff has staff rights. |
| **Main Success Scenario** | User wants to see their past and upcoming reservations.<br>1. User opens "My reservations".<br>2. System retrieves the reservations of this user.<br>3. System displays the list with equipment, date, time slot and status (awaiting confirmation, confirmed, completed, cancelled).<br>4. User selects a reservation.<br>5. System shows the reservation details.<br><br>User may filter the list by date, equipment or status at any time. |
| **Extensions (Alternate Flows)** | **Staff views reservations:**<br>1. Staff opens "All reservations";<br>2. System displays the reservations of all users;<br>3. Staff may filter by user or equipment.<br><br>**No reservations found:**<br>1. System shows the message "No reservations yet". |
| **Postconditions** | Success: the reservation history is displayed (user sees only their own reservations, staff sees all).<br>If no reservations exist, an empty list is shown and the user is informed. |

## 5. View Equipment

| | |
|---|---|
| **Use Case Name** | View equipment |
| **Actors** | User (primary) |
| **Preconditions** | - User is authenticated in the system. |
| **Main Success Scenario** | User wants to see what equipment the makerspace offers.<br>1. User opens the equipment catalogue.<br>2. System displays the list of equipment with type, location and current status.<br>3. User selects a machine.<br>4. System shows the machine details: description, rules of use and status.<br>5. User may proceed to "Track Availability" or "Reserve time slot".<br><br>User may filter the list by type (3D printer, laser cutter, electronics workstation) at any time. |
| **Extensions (Alternate Flows)** | **No equipment matches the filter:**<br>1. System shows the message "No equipment found";<br>2. User changes or resets the filter.<br><br>**Machine is blocked:**<br>1. System marks the machine as "Blocked";<br>2. System shows the block reason and period. |
| **Postconditions** | Success: the user has seen the equipment list and/or details of a machine.<br>Exception: the user is informed that no equipment was found. |

## 6. Track Availability

| | |
|---|---|
| **Use Case Name** | Track availability |
| **Actors** | User (primary) |
| **Preconditions** | - User is authenticated in the system;<br>- The machine exists in the system. |
| **Main Success Scenario** | User wants to know when a machine is free.<br>1. User selects a machine.<br>2. User selects a date.<br>3. System checks the machine status.<br>4. System retrieves the existing reservations for this date.<br>5. System displays a calendar with free and booked time slots.<br><br>User may select another date to compare. |
| **Extensions (Alternate Flows)** | **Machine is blocked:**<br>1. System shows all slots in the block period as unavailable;<br>2. System shows the block reason and block period.<br><br>**No free slots on the selected date:**<br>1. System shows the message "Fully booked";<br>2. System suggests the nearest free time slots. |
| **Postconditions** | Success: the user sees the free and booked time slots of the machine for the selected date.<br>Exception: the user is informed that the machine is blocked or fully booked. |
## 7. Report Issue

| | |
|---|---|
| **Use Case Name** | Report issue |
| **Actors** | Staff (primary)<br>User (secondary) |
| **Preconditions** | - Staff is authenticated in the system;<br>- Staff has staff rights;<br>- At least one report has been submitted by a user ("Report"). |
| **Main Success Scenario** | Staff wants to review and handle a reported problem.<br>1. Staff opens the list of reports.<br>2. System displays the reports with equipment, date and status (open, in progress, resolved, rejected).<br>3. Staff selects an open report.<br>4. System shows the report details: equipment, user, issue type and description.<br>5. Staff sets the status to "In progress".<br>6. Staff fixes the problem.<br>7. Staff sets the status to "Resolved" and adds a comment.<br>8. System notifies the user who submitted the report. |
| **Extensions (Alternate Flows)** | **Machine is unsafe to use:**<br>1. Staff decides the machine must not be used;<br>2. Staff blocks the machine ("Block Machine" extends this use case).<br><br>**Report is not valid:**<br>1. Staff sets the status to "Rejected" and adds the reason;<br>2. System notifies the user.<br><br>**No open reports:**<br>1. System shows the message "No open reports". |
| **Postconditions** | Success: the report is resolved or rejected and the user is notified.<br>Exception: the report status is unchanged. |

## 8. Cancel Reservations

| | |
|---|---|
| **Use Case Name** | Cancel reservations |
| **Actors** | User (primary)<br>Staff (primary) |
| **Preconditions** | - User/Staff is authenticated in the system;<br>- The reservation exists and has not started yet. |
| **Main Success Scenario** | User wants to cancel their reservation.<br>1. User opens "My reservations".<br>2. User selects an upcoming reservation.<br>3. User chooses "Cancel reservation".<br>4. System asks the user to confirm the cancellation.<br>5. User confirms.<br>6. System sets the reservation status to "Cancelled".<br>7. System makes the time slot available again.<br>8. User receives a confirmation. |
| **Extensions (Alternate Flows)** | **Staff cancels reservations (e.g. during "Block Machine"):**<br>1. Staff selects one or more reservations;<br>2. Staff enters the reason;<br>3. System cancels the selected reservations;<br>4. System notifies the affected users with the reason.<br><br>**Reservation has already started or ended:**<br>1. Cancellation is not allowed;<br>2. System shows an error to the user.<br><br>**User does not confirm the cancellation:**<br>1. Reservation stays unchanged. |
| **Postconditions** | Success: the reservation is cancelled, the time slot is free again and the user is informed.<br>Exception: the reservation is unchanged and the user is informed why. |

## 9. Check Reservation

| | |
|---|---|
| **Use Case Name** | Check reservation |
| **Actors** | User (primary) |
| **Preconditions** | - User is authenticated in the system;<br>- User has a reservation with status "Awaiting confirmation";<br>- The reservation starts in 15 minutes or less. |
| **Main Success Scenario** | User wants to confirm that they will use their reservation.<br>1. System sends the user a reminder 15 minutes before the start.<br>2. User opens the reservation.<br>3. System shows the reservation details: equipment, time slot and status.<br>4. User confirms the reservation.<br>5. System sets the status to "Confirmed".<br>6. User receives a confirmation. |
| **Extensions (Alternate Flows)** | **User does not confirm before the start:**<br>1. System cancels the reservation automatically;<br>2. System makes the time slot available again;<br>3. System notifies the user.<br><br>**Reservation was cancelled by staff:**<br>1. System shows the status "Cancelled" and the reason;<br>2. User cannot confirm the reservation. |
| **Postconditions** | Success: the reservation is confirmed.<br>Exception: the reservation is cancelled and the user is notified. |




## 10. Call Maintenance

| | |
|---|---|
| **Use Case Name** | Call Maintenance |
| **Actors** | Staff (primary)<br>Database (secondary) |
| **Preconditions** | - Staff is authenticated in the system;<br>- Database is reachable;<br>- At least one open report exists for the equipment, or a consumable is below its minimum threshold. |
| **Main Success Scenario** | Staff wants to request maintenance for a faulty or low-supply machine.<br>1. Staff opens "View Tickets" and selects a report.<br>2. System retrieves the equipment data and the report details from the Database.<br>3. Staff chooses "Call Maintenance".<br>4. System includes "Report": it compiles the maintenance request (equipment, location, reason).<br>5. Staff reviews and confirms the request.<br>6. System sends the request to the maintenance service.<br>7. System updates the report status to "Maintenance requested".<br>8. Staff receives a confirmation. |
| **Extensions (Alternate Flows)** | **Low material (extends Track Material):**<br>1. Track Material detects a consumable below the minimum threshold;<br>2. Staff calls maintenance for a refill and continues from step 4.<br><br>**Maintenance already requested:**<br>1. System shows the status of the existing request;<br>2. No new request is created.<br><br><br>**Database is not reachable:**<br>1. System shows an error to Staff;<br>2. The request is not sent. |
| **Postconditions** | Success: the maintenance request is sent and the report status is updated.<br>Exception: no request is created and Staff is informed why. |


## 11. Manage Accounts

| | |
|---|---|
| **Use Case Name** | Call Maintenance |
| **Actors** | Staff (primary)<br>Database (secondary) |
| **Preconditions** | - Staff is authenticated in the system;<br>- Database is reachable;<br>- At least one open report exists for the equipment, or a consumable is below its minimum threshold. |
| **Main Success Scenario** | Staff wants to request maintenance for a faulty or low-supply machine.<br>1. Staff opens "View Tickets" and selects a report.<br>2. System retrieves the equipment data and the report details from the Database.<br>3. Staff chooses "Call Maintenance".<br>4. System includes "Report": it compiles the maintenance request (equipment, location, reason).<br>5. Staff reviews and confirms the request.<br>6. System sends the request to the maintenance service.<br>7. System updates the report status to "Maintenance requested".<br>8. Staff receives a confirmation. |
| **Extensions (Alternate Flows)** | **Low material (extends Track Material):**<br>1. Track Material detects a consumable below the minimum threshold;<br>2. Staff calls maintenance for a refill and continues from step 4.<br><br>**Maintenance already requested:**<br>1. System shows the status of the existing request;<br>2. No new request is created.<br><br>**Machine has upcoming reservations:**<br>1. System warns Staff about the booked time slots;<br>2. Staff continues or cancels the request.<br><br>**Database is not reachable:**<br>1. System shows an error to Staff;<br>2. The request is not sent. |
| **Postconditions** | Success: the maintenance request is sent and the report status is updated.<br>Exception: no request is created and Staff is informed why. |


