
function testFilter(newRecord, roleToCheck, currentUserId) {
    const isForUser = !newRecord.user_id || (currentUserId && String(newRecord.user_id) === String(currentUserId));

    let audField = newRecord.audience;
    // Robust parsing for Postgres array strings (e.g. "{all,teacher}")
    let audience = [];
    if (Array.isArray(audField)) {
        audience = audField;
    } else if (typeof audField === 'string') {
        if (audField.startsWith('{') && audField.endsWith('}')) {
            audience = audField.slice(1, -1).split(',').map(s => s.trim());
        } else {
            audience = [audField];
        }
    }

    const isForRole = audience.some((s) => {
        const audStr = String(s || '').toLowerCase();
        return audStr === roleToCheck || audStr === 'all';
    });

    return isForUser && isForRole;
}

const payloadMock = {
    new: {
        user_id: null,
        audience: "{all}",
        title: "Test"
    }
};

console.log("Result with {all}:", testFilter(payloadMock.new, 'teacher', 'uuid-123'));

const payloadMockArray = {
    new: {
        user_id: null,
        audience: ["all"],
        title: "Test"
    }
};
console.log("Result with ['all']:", testFilter(payloadMockArray.new, 'teacher', 'uuid-123'));
