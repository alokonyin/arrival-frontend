# Backend API Instructions for Arrival Date Feature

## Overview
Add arrival date management to allow admins to set student arrival dates and students to see dynamic countdown timers.

## Database Changes

### 1. Add arrival_date column to students table

```sql
-- Migration: Add arrival_date column
ALTER TABLE students
ADD COLUMN arrival_date DATE NULL;

-- Optional: Add index for queries
CREATE INDEX idx_students_arrival_date ON students(arrival_date);
```

## API Endpoint Changes

### 2. Update GET /api/students/{student_id}

**Current behavior:** Returns student record
**New requirement:** Include `arrival_date` field in response

**Example response:**
```json
{
  "id": "uuid",
  "institution_id": "uuid",
  "program_id": "uuid",
  "full_name": "John Doe",
  "personal_email": "john@example.com",
  "status": "ACTIVE",
  "risk_level": "GREEN",
  "arrival_date": "2025-03-15",  // NEW FIELD (ISO date string or null)
  "created_at": "2024-01-01T00:00:00Z"
}
```

### 3. Update GET /api/students?program_id={program_id}

**Current behavior:** Returns array of students for a program
**New requirement:** Include `arrival_date` field for each student

**Example response:**
```json
[
  {
    "id": "uuid",
    "full_name": "John Doe",
    "personal_email": "john@example.com",
    "arrival_date": "2025-03-15",  // NEW FIELD
    ...
  },
  {
    "id": "uuid",
    "full_name": "Jane Smith",
    "personal_email": "jane@example.com",
    "arrival_date": null,  // No date set yet
    ...
  }
]
```

### 4. Create NEW PATCH /api/students/{student_id}/arrival-date

**Purpose:** Allow admins to set or update a student's arrival date

**Endpoint:** `PATCH /api/students/{student_id}/arrival-date`

**Request body:**
```json
{
  "arrival_date": "2025-03-15"  // ISO date string (YYYY-MM-DD) or null to clear
}
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "full_name": "John Doe",
  "arrival_date": "2025-03-15",
  "updated_at": "2024-11-24T12:00:00Z"
}
```

**Error responses:**
- `400 Bad Request`: Invalid date format
- `404 Not Found`: Student not found
- `422 Unprocessable Entity`: Invalid date (e.g., date in past beyond reasonable window)

**Implementation notes:**
- Validate date format (ISO 8601: YYYY-MM-DD)
- Allow null to clear arrival date
- Optional: Validate that arrival_date is in the future (or within last 7 days for flexibility)
- Update the `updated_at` timestamp
- Return the updated student record

## Python/FastAPI Implementation Example

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import date
from typing import Optional

router = APIRouter()

class ArrivalDateUpdate(BaseModel):
    arrival_date: Optional[date] = None

@router.patch("/api/students/{student_id}/arrival-date")
async def update_arrival_date(
    student_id: str,
    update: ArrivalDateUpdate
):
    """Update student arrival date"""

    # Fetch student from database
    student = await db.fetch_one(
        "SELECT * FROM students WHERE id = $1",
        student_id
    )

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Update arrival date
    await db.execute(
        """
        UPDATE students
        SET arrival_date = $1, updated_at = NOW()
        WHERE id = $2
        """,
        update.arrival_date,
        student_id
    )

    # Fetch and return updated record
    updated_student = await db.fetch_one(
        "SELECT * FROM students WHERE id = $1",
        student_id
    )

    return {
        "id": updated_student["id"],
        "full_name": updated_student["full_name"],
        "arrival_date": updated_student["arrival_date"],
        "updated_at": updated_student["updated_at"]
    }
```

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] GET /api/students/{id} includes arrival_date field
- [ ] GET /api/students?program_id={id} includes arrival_date for all students
- [ ] PATCH /api/students/{id}/arrival-date sets valid date
- [ ] PATCH /api/students/{id}/arrival-date clears date when null
- [ ] PATCH /api/students/{id}/arrival-date returns 404 for invalid student_id
- [ ] PATCH /api/students/{id}/arrival-date validates date format
- [ ] Frontend countdown timer displays correct days until arrival
- [ ] Admin can edit arrival dates in Students tab
- [ ] Changes persist after page refresh

## Frontend Integration Points

The frontend is already updated and will:
1. Fetch arrival_date from `GET /api/students/{id}` on student page load
2. Calculate days until arrival dynamically
3. Display countdown timer with color coding (red <7 days, amber <30 days)
4. Allow admins to edit dates in the Students tab
5. Save changes via `PATCH /api/students/{id}/arrival-date`

## Optional Enhancements (Future)

- Add arrival_date to bulk student upload
- Send automated reminder emails based on arrival_date
- Add arrival_date filtering in admin analytics
- Calculate deadline urgency based on arrival_date vs checklist completion
