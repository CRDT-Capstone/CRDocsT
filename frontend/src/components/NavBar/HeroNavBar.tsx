export const HeroNavBar = () => {
    return (
        <div className="gap-2 w-full navbar-end">
            <a href="/sign-in" className="font-normal btn btn-ghost btn-sm">
                Sign in
            </a>
            <a href="/sign-up" className="btn btn-primary btn-sm">
                Get started
            </a>
        </div>
    );
};
