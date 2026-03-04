// src/components/session-cards/ClassType.jsx
// Toggle between In-Person and Online class types
// Acts like radio buttons — only one can be selected at a time
// Clicking the active one deselects it (sets classType to "")

export default function ClassType({ classType, setClassType }) {
    return (
        <div className="form-group">
            <label className="form-label">Class Type</label>
            <div className="checkbox-group">
                <label>
                    <input
                        type="checkbox"
                        checked={classType === "inPerson"}
                        onChange={() => setClassType(classType === "inPerson" ? "" : "inPerson")}
                    />
                    <span>In-Person</span>
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={classType === "online"}
                        onChange={() => setClassType(classType === "online" ? "" : "online")}
                    />
                    <span>Online</span>
                </label>
            </div>
        </div>
    );
}