# InterviewPro 🤖

**The AI-powered interview preparation platform.**

[**Visit the Live App**](https://www.interviewpro.mikeohane.com)

---

## 🚀 What is InterviewPro?

InterviewPro is an advanced interview preparation tool designed to give job seekers a competitive edge. By leveraging large language models and autonomous agents, it transforms a simple job listing into a comprehensive, personalized interview training program.

The goal is simple: help you understand the role deeper than other candidates, practice realistically, and improve your performance before it counts.

## ⚙️ How It Works

The application follows a four-step workflow designed to mirror the lifecycle of preparing for a specific opportunity:

### 📥 1. Job Ingestion
You start by providing the URL to a job listing (or manually pasting the details). The app scrapes and parses the listing to understand the core requirements, company identity, and role expectations.

**Personalize Your Prep:** You can also upload your resume, cover letter, or other personal documents. The AI analyzes your background to tailor the interview questions and feedback specifically to your experience level and skills.

### 🕵️‍♂️ 2. Deep Research
Before you even practice, the app acts as a dedicated research analyst. Using autonomous agents, it scours the web to build a rigorous "Deep Research Report" covering four critical pillars:
- **Company Strategy & Context**: Mission, revenue models, competitive landscape, and recent news.
- **Role Success Profile**: Key deliverables, KPIs, and what "good" looks like in this specific seat.
- **Team & Culture**: Organizational structure, decision-making frameworks, and work environment.
- **Domain Knowledge**: Industry-specific trends, tools, and terminology you should know.

### 🗣️ 3. Mock Interview
Once prepared, you enter a mock interview simulation. The bot adopts the persona of a recruiter or hiring manager specific to that company.
- **Realistic Dialogue**: The AI asks relevant, probing questions based on the research.
- **Voice Interaction**: Speak your answers naturally using speech-to-text integration.
- **Adaptive Flow**: The interview evolves based on your responses, just like a real conversation.

> *Try using the microphone to speak your answers just like a real interview!*

### 📊 4. Performance Analysis
After the interview, the application analyzes your transcript. You receive a detailed breakdown of your performance, highlighting:
- **Strengths**: What you communicated effectively.
- **Areas for Improvement**: Specific feedback on clarity, relevance, and impact.
- **Actionable Tips**: Concrete advice on how to refine your answers for the real thing.

## 💻 Technologies

This project is a modern web application built with the latest React ecosystem and AI tools.

### Core Stack
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Language**: TypeScript

### AI & Data
- **LLM Integration**: [OpenAI API](https://platform.openai.com/) (GPT-4o) & OpenAI Agents
- **Web Scraping**: [Firecrawl](https://www.firecrawl.dev/) for robust extraction of job listings and company data.
- **Document Parsing**: Support for PDF, RTF, and DOCX parsing via `pdfjs-dist`, `mammoth`, and `rtf-parser`.
- **OCR**: `tesseract.js` for image-based text extraction.

## 📂 Project Structure

- **`interview-bot-app/`**: The main Next.js production application.
- **`python/`**: A sandbox directory used for research, prompt engineering, and prototyping new AI agent behaviors before they are ported to the main application.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).
