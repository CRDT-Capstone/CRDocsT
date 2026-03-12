import { LuMessageSquarePlus } from "react-icons/lu";

type props = {
    position: {
        top: number,
    }
}

const AddCommentButton = ({ position }: props) => {
    return (
        <button
            className="fixed right-4 opacity-50 hover:text-green-200"
            style={{ top: position.top }}
        >
            <LuMessageSquarePlus />
        </button>
    );
}

export default AddCommentButton;