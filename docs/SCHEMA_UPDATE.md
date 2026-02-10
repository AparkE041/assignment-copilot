# Schema Update: Syllabus + Tutor Chat

New columns and tables were added. Apply them with:

```bash
npx prisma db push --accept-data-loss
```

Or create a new migration after resolving any drift:

```bash
npx prisma migrate dev --name add-syllabus-and-tutor
```

**Changes:**
- `Course.syllabusExtractedText` – Extracted text from syllabus PDF/DOCX links
- `TutorThread` – One per user for the global AI tutor chat
- `TutorMessage` – Messages in tutor threads
