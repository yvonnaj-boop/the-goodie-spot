module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  try {
    const b = req.body || {};
    const priceMap = {
      Vanilla: 'price_1UMCYaBAG9LAVVPzCwpRETGK',
      Chocolate: 'price_1UMCYaBAG9LAVVPzbT1Nxl5y',
      Strawberry: 'price_1UMCYaBAG9LAVVPzaCSHffl5',
      Funfetti: 'price_1UMCYaBAG9LAVVPzqwnkjkJ3'
    };
    if (!b.name || !b.email || !b.phone || !b.eventDate || !b.pickupDate || !b.pickupTime || !Array.isArray(b.items) || !b.items.length) return res.status(400).json({error:'Please complete all required fields.'});
    const params = new URLSearchParams();
    params.set('mode','payment');
    params.set('customer_email',b.email);
    params.set('phone_number_collection[enabled]','true');
    const siteUrl = process.env.SITE_URL || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    params.set('success_url',siteUrl + '/?payment=success');
    params.set('cancel_url',siteUrl + '/?payment=cancelled');
    b.items.forEach((item,i)=>{
      if (!priceMap[item.flavor] || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 5) throw new Error('Invalid flavor or quantity.');
      params.set('line_items['+i+'][price]',priceMap[item.flavor]);
      params.set('line_items['+i+'][quantity]',String(item.quantity));
    });
    const meta = {customer_name:b.name,phone:b.phone,event_date:b.eventDate,pickup_date:b.pickupDate,pickup_time:b.pickupTime,theme:(b.theme||'').slice(0,500),details:(b.details||'').slice(0,500)};
    Object.entries(meta).forEach(([k,v])=>params.set('metadata['+k+']',v));
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:'Bearer '+process.env.STRIPE_SECRET_KEY,'Content-Type':'application/x-www-form-urlencoded'},body:params});
    const data = await r.json();
    if (!r.ok) return res.status(r.status >= 400 && r.status < 500 ? r.status : 500).json({error:data?.error?.message || 'Checkout could not be created.'});
    return res.status(200).json({url:data.url});
  } catch(e) { return res.status(500).json({error:e.message || 'Checkout could not be created.'}); }
};