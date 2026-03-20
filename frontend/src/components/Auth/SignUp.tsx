import { SignUp } from "@clerk/clerk-react";
import uiStore from "../../stores/uiStore";
import { useEffect } from "react";
import { NavBarType } from "../../types";
import { AuthContainer, clerkAppearance } from "./Shared";

export const SignUpPage = () => {
    const setNavBarType = uiStore((state) => state.setNavBarType);

    useEffect(() => {
        setNavBarType(NavBarType.AUTH);
        return () => setNavBarType(NavBarType.UNSPECIFIED);
    }, [setNavBarType]);

    return (
        <AuthContainer>
            <SignUp appearance={clerkAppearance} />
        </AuthContainer>
    );
};
