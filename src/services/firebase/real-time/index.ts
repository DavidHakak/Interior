import { getDatabase } from "firebase/database";
import { firebase } from "../config";

export const rtDB = getDatabase(firebase);
