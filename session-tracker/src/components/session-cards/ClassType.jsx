// src/components/session-cards/ClassType.jsx
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