import { useRef, ReactNode, forwardRef } from "react";
import { LuX } from "react-icons/lu";

interface ModalProps {
    children: ReactNode;
    title?: string;
    className?: string;
}

export const Modal = forwardRef<HTMLDialogElement, ModalProps>(
    ({ children, title, className = "w-11/12 max-w-2xl" }, ref) => {
        const handleClose = () => {
            if (ref && "current" in ref && ref.current) {
                ref.current.close();
            }
        };

        return (
            <dialog ref={ref} className="modal">
                <div className={`bg-base-200 modal-box ${className}`}>
                    {title && (
                        <div className="flex justify-between items-center mb-6 w-full">
                            <h3 className="pl-4 text-lg font-bold">{title}</h3>
                            <button type="button" onClick={handleClose} className="btn btn-sm btn-circle btn-ghost">
                                <LuX />
                            </button>
                        </div>
                    )}
                    {children}
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        );
    },
);

const useModal = () => {
    const modalRef = useRef<HTMLDialogElement>(null);

    const showModal = () => {
        modalRef.current?.showModal();
    };

    const closeModal = () => {
        modalRef.current?.close();
    };

    return { modalRef, showModal, closeModal };
};

export default useModal;
