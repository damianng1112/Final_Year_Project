# Telemedicine Platform

A full-stack telemedicine application enabling virtual healthcare consultations, appointment scheduling, and AI-powered symptom assessments.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Machine Learning Components](#machine-learning-components)
- [WebSocket Communication](#websocket-communication)
- [Docker Deployment](#docker-deployment)
- [Development](#development)
- [Testing](#testing)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)

## 🔍 Overview

This telemedicine platform addresses the growing need for remote healthcare services, offering a secure and accessible solution for patients to connect with healthcare providers. The system supports real-time video consultations, instant messaging, appointment scheduling, and AI-powered symptom assessment to streamline the patient experience.

## ✨ Features

### For Patients
- **Account Management**: Registration, profile editing, and secure authentication
- **AI Symptom Assessment**: Get preliminary diagnostics using our ML-powered triage system
- **Appointment Booking**: Schedule consultations with available doctors
- **Video Consultations**: Connect with doctors through secure WebRTC video calls
- **Secure Messaging**: Chat with healthcare providers about your medical concerns
- **Symptom Checker**: Use our ML-based disease prediction tool to analyze symptoms

### For Doctors
- **Professional Profiles**: Create and manage medical professional profiles
- **Availability Management**: Set recurring schedules and specific dates for appointments
- **Patient Consultations**: Conduct video consultations with patients
- **Medical Records**: Access relevant patient information during consultations
- **Secure Communication**: Engage with patients through encrypted messaging

### System Features
- **Role-Based Access**: Different capabilities for patients and doctors
- **JWT Authentication**: Secure user authentication and session management
- **Real-time Communication**: WebSocket-based messaging and video call signaling
- **Responsive Design**: Works across desktop and mobile devices
- **Docker Integration**: Easy deployment with containerization
- **Local LLM Integration**: Private, HIPAA-compliant AI processing

## 🛠️ Technology Stack

### Frontend
- **React.js**: UI library for building the user interface
- **React Router**: Client-side routing
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Socket.IO Client**: WebSocket communication for real-time features
- **Simple-Peer**: WebRTC peer-to-peer connections for video calls
- **Axios**: HTTP client for API requests

### Backend
- **Node.js**: JavaScript runtime for the server
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database for data storage
- **Mongoose**: MongoDB object modeling
- **Socket.IO**: WebSocket server for real-time communication
- **JWT**: Authentication mechanism using JSON Web Tokens
- **bcrypt.js**: Password hashing for security

### Machine Learning & AI
- **Python**: Language for the ML microservice
- **Flask**: Lightweight web framework for the ML API
- **scikit-learn**: Machine learning library for disease prediction
- **Ollama**: Local large language model runtime
- **DeepSeek**: LLM for symptom assessment and medical reasoning

### DevOps & Deployment
- **Docker**: Containerization platform
- **Docker Compose**: Multi-container Docker applications
- **Nginx**: Web server and reverse proxy

## 🏗️ Architecture

The application follows a microservices architecture with three primary components:

1. **Frontend Service (React)**: 
   - User interface for patients and doctors
   - Communicates with backend through REST APIs and WebSockets

2. **Backend Service (Node.js/Express)**:
   - Core application logic and API endpoints
   - Database interactions via Mongoose
   - WebSocket server for real-time features
   - Authentication and authorization

3. **ML Microservice (Python/Flask)**:
   - Disease prediction model based on symptom input
   - Symptom database and matching algorithms
   - Isolated service for better scalability

4. **LLM Integration (Ollama/DeepSeek)**:
   - Local LLM for medical triage
   - Symptom analysis and severity assessment
   - Recommendation engine for patient care

### Database Schema

The MongoDB database includes the following main collections:

- **Users**: Patient and doctor profiles with authentication details
- **Appointments**: Scheduled consultations linking doctors and patients
- **Messages**: Communication history between users
- **Availability**: Doctor scheduling information

### Communication Flow

- **HTTP REST**: Primary API communication for CRUD operations
- **WebSockets**: Real-time messaging and video call signaling
- **WebRTC**: Peer-to-peer video and audio streams
- **Internal APIs**: Communication between backend and ML services

## 📥 Installation

### Prerequisites
- Node.js (v18 or later)
- Python 3.12+
- Docker and Docker Compose
- MongoDB (if running locally without Docker)

### Using Docker (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/telemedicine-platform.git
   cd telemedicine-platform
   ```

2. Set up environment variables (see [Environment Variables](#environment-variables) section):
   ```bash
   cp telemedicine-frontend/.env.example telemedicine-frontend/.env
   cp telemedicine-backend/.env.example telemedicine-backend/.env
   ```

3. Start the Docker containers:
   ```bash
   docker-compose up -d
   ```

4. The application will be accessible at:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - ML API: http://localhost:5001

### Manual Setup (Development)

#### Frontend
```bash
cd telemedicine-frontend
npm install
cp .env.example .env
# Edit .env with appropriate values
npm start
```

#### Backend
```bash
cd telemedicine-backend
npm install
cp .env.example .env
# Edit .env with appropriate values
npm run dev
```

#### ML Service
```bash
cd telemedicine-backend/api/ml_model
pip install -r requirements.txt
python SymptomChecker.py
```

## 🔑 Environment Variables

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_PY_API_URL=http://localhost:5001
```

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/telemedicine
JWT_SECRET=your_jwt_secret_key
CLIENT_URL=http://localhost:3000
```

## 📱 Usage

### Patient Flow
1. Register as a patient
2. Use the AI symptom assessment for preliminary diagnosis
3. Book an appointment with a doctor
4. Join video consultation at the scheduled time
5. Message the doctor with follow-up questions

### Doctor Flow
1. Register as a doctor with credential verification
2. Set up availability schedule
3. Review upcoming appointments
4. Conduct video consultations with patients
5. Send follow-up messages to patients

## 🔄 API Endpoints

### Authentication
- `POST /api/users/signup` - Register a new user
- `POST /api/users/login` - User login

### User Management
- `GET /api/users/user/:id` - Get user profile
- `PUT /api/users/user/:id` - Update user profile
- `DELETE /api/users/user/:id` - Delete user account
- `GET /api/users/doctors` - Get all doctors

### Appointments
- `GET /api/appointments/:userId` - Get user's appointments
- `POST /api/appointments/book-appointment` - Book a new appointment
- `PUT /api/appointments/appointment/:id` - Update appointment
- `DELETE /api/appointments/appointment/:id` - Cancel appointment
- `GET /api/appointments/detail/:id` - Get appointment details

### Availability
- `GET /api/availability/:doctorId` - Get doctor's available slots
- `POST /api/availability/set-availability` - Set specific date availability
- `POST /api/availability/set-recurring` - Set recurring availability
- `POST /api/availability/generate-monthly` - Generate monthly availability
- `GET /api/availability/:doctorId/range` - Get availability in date range

### Messages
- `GET /api/messages/:appointmentId` - Get chat history
- `POST /api/messages` - Send a message

### Triage
- `POST /api/triage` - Get AI assessment of symptoms

### ML Model
- `GET /symptoms` - Get list of all symptoms
- `POST /predict` - Predict disease based on symptoms

## 🧠 Machine Learning Components

### Disease Prediction Model
The platform includes a machine learning model that predicts potential diseases based on patient symptoms. The model is trained on a comprehensive dataset of disease-symptom relationships and uses Support Vector Machine (SVM) algorithm for classification.

Key files:
- `diseaseModel.ipynb`: Jupyter notebook detailing the model training process
- `SymptomChecker.py`: Flask API for serving predictions
- `datasets/`: Contains training data and symptom metadata

### AI Triage System
The triage system uses DeepSeek, a medical-specialized large language model, to assess symptom severity and provide preliminary guidance:

1. Patient describes symptoms through the chat interface
2. The LLM analyzes the symptoms and assigns a severity level
3. The system provides self-care advice or recommends booking an appointment
4. All interactions are private and processed locally via Ollama

## 📡 WebSocket Communication

The platform uses Socket.IO for real-time features:

### Chat System
- Socket events: `join-chat`, `leave-chat`, `send-message`, `receive-message`
- Room-based messaging for appointment-specific conversations
- Message persistence in MongoDB

### Video Call Signaling
- Socket events: `join-room`, `signal`, `user-connected`, `user-disconnected`
- Facilitates WebRTC connection establishment
- Appointment-based room management

## 🐳 Docker Deployment

The `docker-compose.yml` file defines four services:

1. **frontend**: React application served through Nginx
2. **backend**: Node.js/Express API server
3. **api**: Python Flask service for ML functionality
4. **ollama**: Local LLM serving container

Network configuration ensures services can communicate while being isolated from the host network. Persistent volumes maintain data between container restarts.

## 🚀 Development

### Code Structure

#### Frontend
```
telemedicine-frontend/
├── public/                  # Static assets
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/               # Page components
│   ├── style/               # CSS styles
│   ├── utils/               # Utility functions
│   └── index.js             # Application entry point
```

#### Backend
```
telemedicine-backend/
├── api/
│   ├── ml_model/           # Python ML service
│   └── routes/             # API route handlers
├── middleware/             # Express middleware
├── models/                 # Mongoose data models
├── sockets/                # WebSocket handlers
└── index.js                # Server entry point
```

### Adding Features

When adding new features:
1. Create/modify the appropriate data model
2. Implement API endpoints in the backend
3. Create UI components in the frontend
4. Update documentation

## 🧪 Testing

### Backend Testing
```bash
cd telemedicine-backend
npm test
```

### Frontend Testing
```bash
cd telemedicine-frontend
npm test
```

## 🔮 Future Enhancements

- **Electronic Health Records (EHR) Integration**: Connect with existing healthcare systems
- **Payment Processing**: Add ability to handle payments for consultations
- **Prescription Management**: Allow doctors to issue digital prescriptions
- **Multi-language Support**: Internationalization for broader accessibility
- **Advanced Analytics**: Insights for healthcare providers
- **Mobile Applications**: Native iOS and Android apps
- **Offline Support**: Progressive Web App capabilities
- **Telehealth Device Integration**: Support for remote monitoring devices

## 👥 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the project's coding standards and includes appropriate tests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Acknowledgements

- [Create React App](https://create-react-app.dev/)
- [Express.js](https://expressjs.com/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Socket.IO](https://socket.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Simple-Peer](https://github.com/feross/simple-peer)
- [Ollama](https://ollama.ai/)
- [DeepSeek](https://github.com/deepseek-ai/deepseek-coder)

---

Created with ❤️ for better healthcare access