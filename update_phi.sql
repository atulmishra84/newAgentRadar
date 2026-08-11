UPDATE agents 
SET phi = true, 
    baa_status = 'unsigned', 
    controls = '{"hipaa":"fail", "encryption":"fail"}' 
WHERE name IN ('cae-jarvis', 'acrorchestratorc39f7f');
