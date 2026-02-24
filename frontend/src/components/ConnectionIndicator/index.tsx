import { ConnectionState } from "../../types";

interface ConnectionIndicatorProps {
    connectionState: ConnectionState;
    delay?: number;
}

const ConnectionIndicator = ({ connectionState, delay }: ConnectionIndicatorProps) => {
    let connectionBadge = "badge-success";
    switch (connectionState) {
        case ConnectionState.CONNECTED:
            connectionBadge = "badge-success";
            break;
        case ConnectionState.RECONNECTING:
            connectionBadge = "badge-warning";
            break;
        case ConnectionState.DISCONNECTED:
            connectionBadge = "badge-error";
            break;
    }

    return (
        <div className="flex flex-col items-center">
            <div className={`badge badge-outline  ${connectionBadge}`}>{connectionState.toString().toUpperCase()}</div>
            {delay !== undefined && (
                <div className="text-xs text-base-content/70">Next retry in: {Math.ceil(delay / 1000)}s</div>
            )}
        </div>
    );
};

export default ConnectionIndicator;
