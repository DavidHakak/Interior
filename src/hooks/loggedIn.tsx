import { useSession } from "next-auth/react";

export const useCheckIfLoggedIn = () => {
    const { data: session } = useSession();
    return Boolean(session?.user);
};