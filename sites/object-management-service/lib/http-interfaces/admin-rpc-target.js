export default class AdminRPCTarget {

    async remoteProcedureCall(request, response) {
        const json = await request.json();

        const res = {
            jsonrpc: '2.0',
            id: json.id,
            result: { scopeId: json.params.scopeId, tokens: [] },
        };

        return response.respondWithJSON(200, res);
    }
}
