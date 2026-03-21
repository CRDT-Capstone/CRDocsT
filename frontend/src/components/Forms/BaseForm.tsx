import { ReactNode } from "react";
import { Modal } from "../../hooks/modal";

interface BaseFormProps {
    triggerText: ReactNode;
    triggerClassName?: string;
    title?: string;
    showModal: () => void;
    modalRef?: React.RefObject<HTMLDialogElement | null>;
    children: ReactNode;
}

export const BaseForm = ({
    triggerText: trigger,
    triggerClassName = "m-4 btn btn-l btn-primary",
    title,
    modalRef,
    showModal,
    children,
}: BaseFormProps) => {
    return (
        <>
            <button
                type="button"
                className={triggerClassName}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showModal();
                }}
            >
                {trigger}
            </button>

            <Modal ref={modalRef} title={title} className="flex flex-col justify-center items-center p-4 modal-box">
                {children}
            </Modal>
        </>
    );
};
