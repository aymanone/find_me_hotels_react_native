export  const earliestDate = () =>{
    const today = new Date();
    return new Date(today.setHours(0,0,0,0));
};
export const outDatedReq = (req) => {
    if (!req) return true; // Return true if request is null (consider null requests as outdated)
    const today = new Date();
    return new Date(req.start_date) < new Date(today.setHours(0,0,0,0));
};
export const inDateReq = (req) => {
    if (!req) return false; // Return false if request is null
    const today = new Date();
    return new Date(req.start_date) >= new Date(today.setHours(0,0,0,0));
};
export const outDatedOffer = (offer, request)=>{
    // Check if the offer is outdated compared to the request
    if (!offer || !request) return false;
    return new Date(offer.updated_at) < new Date(request.updated_at) 
    
    
   
};
