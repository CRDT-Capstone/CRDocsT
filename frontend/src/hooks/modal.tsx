import { useRef, ReactNode } from "react";
import { LuX } from "react-icons/lu";

interface ModalProps {
    children: ReactNode;
    title?: string;
    className?: string;
}

const useModal = () => {
    const modalRef = useRef<HTMLDialogElement>(null);

    const showModal = () => {
        modalRef.current?.showModal();
    };

    const closeModal = () => {
        modalRef.current?.close();
    };

    const Modal = ({ children, title, className = "w-11/12 max-w-2xl" }: ModalProps) => (
        <dialog ref={modalRef} className="modal">
            <div className={`modal-box ${className}`}>
                {title && (
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold">{title}</h3>
                        <button type="button" onClick={closeModal} className="btn btn-sm btn-circle btn-ghost">
                            <LuX />
                        </button>
                    </div>
                )}
                {children}
            </div>
            {/* Backdrop click closes the modal */}
            <form method="dialog" className="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    );

    return { Modal, showModal, closeModal };
};

export default useModal;
