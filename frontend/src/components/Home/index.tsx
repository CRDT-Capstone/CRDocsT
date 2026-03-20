import { SignedIn, SignedOut, useSession } from "@clerk/clerk-react";
import UserCanvas from "../UserCanvas";
import Hero from "../Hero";

const Home = () => {
    const { isLoaded } = useSession();

    if (!isLoaded) {
        return <Hero />;
    }

    return (
        <>
            <SignedIn>
                <UserCanvas />
            </SignedIn>
            <SignedOut>
                <Hero />
            </SignedOut>
        </>
    );
};

export default Home;
