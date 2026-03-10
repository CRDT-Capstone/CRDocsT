import { Link } from "react-router-dom";

export const HeroNavBar = () => {
    return (
        <div className="gap-2 w-full navbar-end">
            <Link to="/sign-in" className="font-normal btn btn-ghost btn-sm">
                Sign in
            </Link>
            <Link to="/sign-up" className="btn btn-primary btn-sm">
                Get started
            </Link>
        </div>
    );
};
