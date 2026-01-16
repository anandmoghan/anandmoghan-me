export default function AboutPage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-12 px-6 sm:px-8 lg:px-12">
        <div className="absolute inset-0 -z-10" style={{
          background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)'
        }}></div>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            Anand Mohan
          </h1>
          <div className="w-20 h-1 rounded-full mb-6 mx-auto" style={{ backgroundColor: 'var(--accent)' }}></div>
          <p className="text-xl mb-6" style={{ color: 'var(--foreground)' }}>
            Applied Scientist at Amazon AGI, specializing in Speech AI and Machine Learning
          </p>
          <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: 'var(--muted)' }}>
            Leading research on Speech-to-Speech Large Language Models and incremental learning strategies 
            at Amazon AGI. 
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm" style={{ color: 'var(--muted)' }}>
            <div className="flex items-center gap-2 justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <circle cx="12" cy="8" r="3" />
              </svg>
              United Kingdom
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 px-6 sm:px-8 lg:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-6 md:left-1/2 md:transform md:-translate-x-0.5 top-0 bottom-0 w-0.5" 
                 style={{ backgroundColor: 'var(--border)' }}></div>
            
            <div className="space-y-12">
              {/* Current Role */}
              <div className="relative flex flex-col md:flex-row md:items-center">
                <div className="md:w-1/2 md:pr-8 md:text-right">
                  <div className="ml-16 md:ml-0 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300" 
                       style={{ backgroundColor: 'white', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-2 md:justify-end">
                      <span className="px-3 py-1 rounded-full text-xs font-medium" 
                            style={{ backgroundColor: 'var(--primary)', color: 'white' }}>Current</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>Sep 2024 - Present</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                      Applied Scientist - AGI
                    </h3>
                    <p className="text-base font-medium mb-3" style={{ color: 'var(--primary)' }}>Amazon • Cambridge</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                      Leading research on Speech-to-Speech LLMs and incremental learning strategies for next-generation AI systems.
                    </p>
                  </div>
                </div>
                <div className="absolute left-6 md:left-1/2 md:transform md:-translate-x-1/2 w-3 h-3 rounded-full border-4 border-white shadow-lg z-10" 
                     style={{ backgroundColor: 'var(--primary)' }}></div>
                <div className="md:w-1/2 md:pl-8"></div>
              </div>

              {/* Previous Amazon Role */}
              <div className="relative flex flex-col md:flex-row md:items-center">
                <div className="md:w-1/2 md:pr-8"></div>
                <div className="absolute left-6 md:left-1/2 md:transform md:-translate-x-1/2 w-3 h-3 rounded-full border-4 border-white shadow-lg z-10" 
                     style={{ backgroundColor: 'var(--accent)' }}></div>
                <div className="md:w-1/2 md:pl-8">
                  <div className="ml-16 md:ml-0 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300" 
                       style={{ backgroundColor: 'white', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>Jul 2019 - Sep 2024</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                      Applied Scientist - AGI
                    </h3>
                    <p className="text-base font-medium mb-3" style={{ color: 'var(--primary)' }}>Amazon • Hyderabad, India</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                      Built production ASR systems, developed federated learning frameworks, and led multilingual speech recognition initiatives.
                    </p>
                  </div>
                </div>
              </div>

              {/* Education - M.Tech */}
              <div className="relative flex flex-col md:flex-row md:items-center">
                <div className="md:w-1/2 md:pr-8 md:text-right">
                  <div className="ml-16 md:ml-0 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300" 
                       style={{ backgroundColor: 'white', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-2 md:justify-end">
                      <span className="px-3 py-1 rounded-full text-xs font-medium" 
                            style={{ backgroundColor: 'var(--card-bg)', color: 'var(--foreground)' }}>Education</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>2017 - 2019</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                      Masters in Artificial Intelligence
                    </h3>
                    <p className="text-base font-medium mb-3" style={{ color: 'var(--primary)' }}>Indian Institute of Science • Bangalore</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                      Specialized in speech recognition and language modeling, published research on attention-based models.
                    </p>
                  </div>
                </div>
                <div className="absolute left-6 md:left-1/2 md:transform md:-translate-x-1/2 w-3 h-3 rounded-full border-4 border-white shadow-lg z-10" 
                     style={{ backgroundColor: '#10b981' }}></div>
                <div className="md:w-1/2 md:pl-8"></div>
              </div>

              {/* Zoho */}
              <div className="relative flex flex-col md:flex-row md:items-center">
                <div className="md:w-1/2 md:pr-8"></div>
                <div className="absolute left-6 md:left-1/2 md:transform md:-translate-x-1/2 w-3 h-3 rounded-full border-4 border-white shadow-lg z-10" 
                     style={{ backgroundColor: '#8b5cf6' }}></div>
                <div className="md:w-1/2 md:pl-8">
                  <div className="ml-16 md:ml-0 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300" 
                       style={{ backgroundColor: 'white', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>Jul 2015 - Jun 2016</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                      Software Engineer - Site24x7
                    </h3>
                    <p className="text-base font-medium mb-3" style={{ color: 'var(--primary)' }}>Zoho • Chennai, India</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                      Full-stack development for performance monitoring platform, built AngularJS web clients and Java APIs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Education - B.Tech */}
              <div className="relative flex flex-col md:flex-row md:items-center">
                <div className="md:w-1/2 md:pr-8 md:text-right">
                  <div className="ml-16 md:ml-0 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300" 
                       style={{ backgroundColor: 'white', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-2 md:justify-end">
                      <span className="px-3 py-1 rounded-full text-xs font-medium" 
                            style={{ backgroundColor: 'var(--card-bg)', color: 'var(--foreground)' }}>Education</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>2011 - 2015</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                      Bachelors in Electronics & Communication
                    </h3>
                    <p className="text-base font-medium mb-3" style={{ color: 'var(--primary)' }}>National Institute of Technology • Calicut</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                      Foundation in signal processing and communication systems, elected student representative.
                    </p>
                  </div>
                </div>
                <div className="absolute left-6 md:left-1/2 md:transform md:-translate-x-1/2 w-3 h-3 rounded-full border-4 border-white shadow-lg z-10" 
                     style={{ backgroundColor: '#10b981' }}></div>
                <div className="md:w-1/2 md:pl-8"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Publications Section */}
      <section className="py-12 px-6 sm:px-8 lg:px-12" style={{ backgroundColor: 'var(--card-bg)' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8" style={{ color: 'var(--foreground)' }}>Publications</h2>
          
          <div className="p-6 rounded-xl shadow-sm" style={{ 
            backgroundColor: 'white',
            border: '1px solid var(--border)'
          }}>
            <div className="space-y-4">
              <div className="pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                  AMuSE: Attentive Multilingual Speech Encoding for Zero-Prior ASR
                </h3>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  IEEE International Conference on Acoustics, Speech and Signal Processing (ICASSP) • 2025
                </p>
              </div>
              
              <div className="pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                  Cross-silo Federated Training in the Cloud with Diversity Scaling and SSL
                </h3>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  IEEE International Conference on Acoustics, Speech and Signal Processing (ICASSP) • 2021
                </p>
              </div>
              
              <div className="pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                  Towards Relevance and Sequence Modeling in Language Recognition
                </h3>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  IEEE Transactions on Audio, Speech and Language Processing • 2020
                </p>
              </div>
              
              <div className="pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                  Attention based Hybrid I-vector BLSTM Model for Language Recognition
                </h3>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Annual Conference of the International Speech Communication Association (INTERSPEECH) • 2019
                </p>
              </div>
              
              <div className="pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                  End-to-End Language Recognition Using Attention Based Hierarchical GRU Models
                </h3>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  IEEE International Conference on Acoustics, Speech and Signal Processing (ICASSP) • 2019
                </p>
              </div>
              
              <div>
                <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                  The LEAP Speaker Recognition System for NIST SRE 2018 Challenge
                </h3>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  IEEE International Conference on Acoustics, Speech and Signal Processing (ICASSP) • 2019
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Skills & Highlights */}
      <section className="py-12 px-6 sm:px-8 lg:px-12" style={{ backgroundColor: 'var(--card-bg)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Skills */}
            <div>
              <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>Technical Skills</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Languages</p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>Python, Java, MATLAB, JavaScript</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>ML/AI</p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>TensorFlow, PyTorch, PySpark, Kaldi-ASR</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Focus Areas</p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>Speech Recognition, Language Models, Federated Learning</p>
                </div>
              </div>
            </div>

            {/* Highlights */}
            <div>
              <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>Key Highlights</h3>
              <div className="space-y-2 text-sm" style={{ color: 'var(--muted)' }}>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: 'var(--primary)' }}></div>
                  <span>6+ publications in top-tier conferences (ICASSP, INTERSPEECH)</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: 'var(--primary)' }}></div>
                  <span>Led 75+ technical interviews for ML science roles</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: 'var(--primary)' }}></div>
                  <span>Reviewer for ICASSP, SPCOM, Amazon ML Conference</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: 'var(--primary)' }}></div>
                  <span>Contributed to COVID-19 detection research (Coswara project)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 px-6 sm:px-8 lg:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>Let's Connect</h2>
          <p className="text-lg mb-8" style={{ color: 'var(--muted)' }}>
            Interested in AI research collaboration or discussing speech technologies?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="mailto:moghan.anand@gmail.com" 
              className="px-6 py-3 rounded-lg font-medium transition-colors"
              style={{ 
                backgroundColor: 'var(--primary)', 
                color: 'white',
                textDecoration: 'none'
              }}
            >
              Get in Touch
            </a>
            <a 
              href="/content/media/docs/Resume.pdf" 
              target="_blank"
              className="px-6 py-3 rounded-lg font-medium transition-colors"
              style={{ 
                backgroundColor: 'white', 
                color: 'var(--primary)',
                border: '2px solid var(--primary)',
                textDecoration: 'none'
              }}
            >
              View Resume
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}