export  const earliestDate = () =>{
    const today = new Date();
    return new Date(today.setHours(0,0,0,0));
};
export const outDatedReq = (req)=>{
    const today= new Date();
    return new Date(req.start_date) < new Date(today.setHours(0,0,0,0));
};
export const inDateReq = (req)=>{
    const today = new Date();
    return new Date(req.start_date) >= new Date(today.setHours(0,0,0,0));
};
export const outDatedOffer = (offer, request)=>{
    // Check if the offer is outdated compared to the request
    if (!offer || !request) throw new Error("Offer and request must be provided");
    return new Date(offer.updated_at) < new Date(request.updated_at) 
    
    
   
};