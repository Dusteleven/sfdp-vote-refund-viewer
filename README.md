# Validator Epoch Reward Tracker

## Frontend: Validator Epoch Reward Tracker

### Overview
The **Validator Epoch Reward Tracker** frontend is a **Next.js** web application that tracks Solana validator rewards across multiple epochs. Users can view rewards for all epochs in a grid format, search for individual validators, and see their specific reward history.

### Features:
- **Validator Epoch Grid**: Displays a grid of epochs where each epoch shows whether a validator has received rewards.
- **Search Functionality**: Allows users to search for a validator by identity key and see their rewards.
- **Modal Details**: Clicking on any epoch opens a modal that displays reward details such as amount, signature, slot, and timestamp.
- **Light/Dark Mode**: Switches between light and dark modes for a better user experience.

### Requirements
- **Node.js**: 16.x or later
- **Tailwind CSS**: Styling framework used for responsive UI
- **Firebase**: Used for Firestore data storage

### Setup
1. Clone the repository:
   ```bash
   git clone <your-repository-url>
   cd validator-epoch-reward-tracker
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Create a `.env.local` file in the root directory and add the following Firebase environment variables:

   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=<your-api-key>
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<your-auth-domain>
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your-project-id>
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<your-storage-bucket>
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
   NEXT_PUBLIC_FIREBASE_APP_ID=<your-app-id>
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=<your-measurement-id>
   ```

4. Run the app locally:
   ```bash
   yarn dev
   ```

5. Open the app in your browser at `http://localhost:3000`.

### Deployment
To deploy the frontend, you can use any hosting platform that supports **Next.js**, such as:

- **Vercel** (Recommended for Next.js applications):
  - [Deploy on Vercel](https://vercel.com/import/project)

- **Firebase Hosting**:
  - [Deploy Firebase Hosting](https://firebase.google.com/docs/hosting)
