import { useNavigate } from "react-router-dom";
import mainStore from "../../stores";
import { NavBarType } from "../../types";
import UserHomeNavBar from "./UserHomeNavBar";
import CanvasNavBar from "./CanvasNavBar";
import ProjectNavBar from "./ProjectNavBar";

interface NavBarProps {}

const NavBar = ({}: NavBarProps) => {
    const navigate = useNavigate();
    const navBarType = mainStore((state) => state.navBarType);
    const activeDocumentId = mainStore((state) => state.activeDocumentId);
    const activeProjectId = mainStore((state) => state.activeProjectId);

    const handleTitleClick = () => {
        if (navBarType === NavBarType.UNSPECIFIED) return;
        navigate("/");
    };

    let navBarChildren: React.ReactNode = <></>;
    switch (navBarType) {
        case NavBarType.UNSPECIFIED:
            navBarChildren = <></>;
            break;
        case NavBarType.HOME:
            navBarChildren = <UserHomeNavBar />;
            break;
        case NavBarType.CANVAS:
            navBarChildren = activeDocumentId ? <CanvasNavBar documentId={activeDocumentId} /> : <></>;
            break;
        case NavBarType.PROJECT:
            navBarChildren = activeProjectId ? <ProjectNavBar projectId={activeProjectId} /> : <></>;
            break;
    }

    return (
        <div className="shadow-sm navbar bg-base-100">
            <div className="flex-none">
                <a className="text-xl btn btn-ghost" onClick={handleTitleClick}>
                    Bragi
                </a>
            </div>
            {navBarChildren}
        </div>
    );
};

export default NavBar;
