import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from "firebase/auth";
import { 
  initializeFirestore, 
  doc, 
  getDocFromServer 
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth and Firestore with robust long polling settings (vital for proxy/iframe sandbox)
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();

// Standard Login Popup Helper
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Erro na autenticação do Google:", error);
    throw error;
  }
};

// Standard Logout Helper
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Erro ao deslogar:", error);
    throw error;
  }
};

// Test Connection on Boot (Required by Firebase Skill Guides)
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("Conexão ao Firestore verificada com sucesso.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.warn("Conexão Offline: Configure as credenciais do Firebase apropriadamente.");
    } else {
      console.log("Teste de conexão Firestore executado (modo offline/desconectado inicial aceitável).");
    }
  }
}

// Call the test connection
testConnection();

// Structured Firestore Error Handler (Required by Firebase Skill Guides)
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error Detailed info: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
