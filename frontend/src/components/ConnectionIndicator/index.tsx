import { ConnectionState } from "../../types";

interface ConnectionIndicatorProps {
    connectionState: ConnectionState;
}

const ConnectionIndicator = ({ connectionState }: ConnectionIndicatorProps) => {
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
        <div className="flex-none">
            <div className={`badge badge-outline  ${connectionBadge}`}>{connectionState.toString().toUpperCase()}</div>
        </div>
    );
};

export default ConnectionIndicator;
