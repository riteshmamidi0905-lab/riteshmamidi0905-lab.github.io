/* Fixed sample corpus + retrieval eval set copied from riteshmamidi0905-lab/genai-doc-assistant (data/sample_docs, data/eval_set.json). Fictional 'Acme Cloud' documents. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RMLab = root.RMLab || {}).ragCorpus = api;
})(typeof self !== 'undefined' ? self : this, function () {
  return {
 "docs": {
  "api_guide": "The Acme Cloud API is REST-based and returns JSON. Authenticate with a bearer token generated in account settings. Tokens can be scoped to read-only or read-write access. The API is rate-limited to one thousand requests per hour on the Pro tier.\n\nThe deployments endpoint lets you create, list, and roll back deployments programmatically. Webhooks can notify your systems when a deployment succeeds or fails. The API version is specified in the URL path and the current stable version is v2.\n\nClient libraries are available for Python and JavaScript. The command-line tool wraps the same API and is the recommended way to script deployments in continuous integration pipelines.",
  "company_handbook": "Acme Cloud is a platform-as-a-service company founded in 2019. Our mission is to make deploying applications effortless for small teams. The company is headquartered in Austin, Texas, and operates fully remote across twelve time zones. We serve more than eight thousand active developers.\n\nOur core product is a managed container platform. Developers push code and Acme Cloud builds, deploys, and scales it automatically. The platform supports Python, Node.js, Go, and Ruby. Autoscaling responds to CPU and request-rate metrics within thirty seconds.\n\nPricing has three tiers. The Hobby tier is free and includes one project and 512 megabytes of memory. The Pro tier is twenty dollars per month and includes ten projects and autoscaling. The Enterprise tier is custom-priced and adds single sign-on, audit logs, and a dedicated support engineer.",
  "security_policy": "Acme Cloud encrypts all data at rest using AES-256 and all data in transit using TLS 1.3. Encryption keys are rotated every ninety days and stored in a hardware security module. Customer data is never used to train machine learning models.\n\nAccess to production systems requires multi-factor authentication and is logged. Engineers receive least-privilege access that expires automatically after eight hours. All access grants are reviewed quarterly.\n\nWe are SOC 2 Type II compliant and undergo an annual third-party penetration test. Security vulnerabilities can be reported to our bug bounty program, which pays rewards up to ten thousand dollars for critical findings. We aim to acknowledge reports within one business day.",
  "support_faq": "To contact support, open a ticket from the dashboard or email help@acmecloud.example. Pro and Enterprise customers receive priority response within four hours during business hours. Hobby tier support is community-based through our forum.\n\nIf a deployment fails, check the build logs in the dashboard under the Activity tab. The most common cause is a missing dependency in the requirements file. Rolling back to a previous deployment takes effect in under a minute.\n\nTo upgrade or downgrade your plan, go to Billing in account settings. Changes are prorated and take effect immediately. Annual plans receive a twenty percent discount compared to monthly billing."
 },
 "cases": [
  {
   "question": "How much does the Pro tier cost?",
   "relevant_doc": "company_handbook"
  },
  {
   "question": "How is data encrypted at rest?",
   "relevant_doc": "security_policy"
  },
  {
   "question": "What is the API rate limit?",
   "relevant_doc": "api_guide"
  },
  {
   "question": "How do I contact support?",
   "relevant_doc": "support_faq"
  },
  {
   "question": "What authentication does the API use?",
   "relevant_doc": "api_guide"
  },
  {
   "question": "Is my data encrypted in transit?",
   "relevant_doc": "security_policy"
  },
  {
   "question": "What are the support hours?",
   "relevant_doc": "support_faq"
  },
  {
   "question": "What is included in the free tier?",
   "relevant_doc": "company_handbook"
  }
 ]
};
});
