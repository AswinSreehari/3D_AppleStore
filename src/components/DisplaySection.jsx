import React from 'react'

const DisplaySection = ({ triggerPreview }) => {

   const handleScrollToTop = () => {
      window.scrollTo({
         top: 0,
         left: 0,
         behavior: 'smooth'
      })
   }

  return (
     <div className="display-section wrapper">
        <div className="title">New</div>
         <p className='text' >Brilliant</p>
         <span className='description'>A display that's up to 2x brighter in the sun</span>
         <button className='button' onClick={triggerPreview}>Preview</button>
         <button className='back-button' onClick={handleScrollToTop}>TOP</button>
     </div>
  )
}

export default DisplaySection