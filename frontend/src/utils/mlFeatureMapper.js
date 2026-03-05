// Complete feature mapping for ML model
export const getAllFeaturesWithDefaults = () => {
    return {
      // Common fields
      "Role": "",
      "Domain": "",
      "Experience of related Domain": "6 - 14",
      
      // Business Analyst
      "Analytical Skills": "Intermediate",
      "Technical Proficiency": "Intermediate",
      "Communication Skills": "Intermediate",
      "Problem Solving Skills": "Intermediate",
      "Years of experience in Business Analysis": "3-5 years",
      "Leadership-Team lead experience": "Non-Lead",
      
      // Backend Engineer
      "Proficiency in Programming Languages": "Intermediate",
      "Database Management (SQL, NoSQL)": "Intermediate",
      "API Development and Integration": "Intermediate",
      "Knowledge of Frameworks": "Intermediate",
      "Understanding of Microservices Architecture": "Intermediate",
      "Years of experience in Bacend Engineer": "3-5 years",
      
      // Frontend Engineer
      "Proficiency in HTML-CSS": "Intermediate",
      "Proficiency in JavaScript-TypeScript": "Intermediate",
      "Knowledge of Frontend Frameworks-Libraries": "Intermediate",
      "UI-UX Design Principles": "Intermediate",
      "Responsive Design and Cross-Browser Compatibility": "Intermediate",
      "Years of experience in FrontEnd engineer": "3-5 years",
      
      // DevOps Engineer
      "Scripting and Automation (Python, Bash)": "Intermediate",
      "Continuous Integration-Continuous Deployment": "Intermediate",
      "Cloud Platforms ( AWS, Azure, GCP)": "Intermediate",
      "Configuration Management Tools": "Intermediate",
      "Monitoring and Logging Tools": "Intermediate",
      "Years of experience in DevOps Engineer": "3-5 years",
      
      // Tech Lead
      "Technical Expertise": "Intermediate",
      "Leadership and Team Management": "Intermediate",
      "Project Management Skills": "Intermediate",
      "Problem-Solving and Decision-Making": "Intermediate",
      "Communication and Collaboration": "Intermediate",
      "Years of experience in Tech Lead": "3-5 years",
      
      // FullStack Engineer
      "Proficiency in Frontend Technologies": "Intermediate",
      "Proficiency in Backend Technologies": "Intermediate",
      "Knowledge of Frontend Frameworks": "Intermediate",
      "Knowledge of Backend Frameworks": "Intermediate",
      "Years of experience in Fullstack engineer": "3-5 years",
      
      // Project Manager
      "planning & scheduling": "Intermediate",
      "Risk Management": "Intermediate",
      "Budgeting and Cost Control": "Intermediate",
      "Knowledge of Project Management Methodologies": "Intermediate",
      
      // Quality Assurance Engineer
      "Excellent communication": "Intermediate",
      "Test Automation": "Intermediate",
      "Knowledge of testing methodologies": "Intermediate",
      "Bug tracking and reporting": "Intermediate",
      "Years of experience in QA": "3-5 years",
      
      // Education (common for all)
      "Bachelor's Degree": "related",
      "Master's Degree": "related",
    };
  };
  
  export const prepareMLPayload = (formValues) => {
    // Start with all features
    const payload = getAllFeaturesWithDefaults();
    
    // Override with user input
    Object.keys(formValues).forEach(key => {
      payload[key] = formValues[key];
    });
    
    return payload;
  };