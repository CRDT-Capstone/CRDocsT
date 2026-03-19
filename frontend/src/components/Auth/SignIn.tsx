import { SignIn } from "@clerk/clerk-react";
import uiStore from "../../stores/uiStore";
import { NavBarType } from "../../types";
import { useEffect } from "react";
import { AuthContainer, clerkAppearance } from "./Shared";

export const SignInPage = () => {
    const setNavBarType = uiStore((state) => state.setNavBarType);
    useEffect(() => {
        setNavBarType(NavBarType.AUTH);
        return () => setNavBarType(NavBarType.UNSPECIFIED);
    }, [setNavBarType]);

    return (
        <AuthContainer>
            <SignIn appearance={clerkAppearance} />
        </AuthContainer>
    );
};
