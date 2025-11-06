from pydantic import BaseModel

class JobListingResearchResponse(BaseModel):
    job_title: str
    job_location: str
    job_description: str
    work_schedule: str
    company_name: str
    expectations_and_responsibilities: str
    requirements: str